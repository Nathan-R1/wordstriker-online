# WordStriker Web App — Architecture Plan

## 1. Architecture Overview

**Pattern:** Client-Server via Ably real-time relay (no P2P)

```
┌─────────────────┐     Ably Pub/Sub (room:{roomId})   ┌─────────────────┐
│  Vue 3 SPA      │◄══════════════════════════════════►│  Vue 3 SPA      │
│  (Player A)     │     channel: "lobby"                │  (Player B)     │
│                  │     channel: "room:{roomId}"        │                  │
│  ably-js SDK     │◄──── Ably Edge Network ───────────►│  ably-js SDK     │
└─────────────────┘                                     └─────────────────┘
       ▲                                                       ▲
       │                                                       │
       │  HTTPS (static assets)                                │
       │                                                       │
┌──────────────────────────────────────────────────────────────────────┐
│  GitHub Pages                                                       │
│  - Serves Vue 3 SPA (static build, client/dist/)                   │
│  - Zero server-side logic                                           │
└──────────────────────────────────────────────────────────────────────┘
```

**No backend to manage.** Ably handles all real-time message relay, channel management, and presence. The Vue SPA is deployed as static files to GitHub Pages.

**Key decisions:**
- **Ably** = middleman for all game messages, lobby discovery, and presence
- **No WebRTC** — all traffic routes through Ably's edge network (no IP exposure, no NAT issues)
- **No Go server** — the SPA connects directly to Ably with a client-side API key restricted to channel patterns
- **Vue 3** = SPA with Canvas/DOM-based game rendering
- **TypeScript + Zod** for compile-time and runtime message validation (XSS prevention)

## 2. Project Structure

```
dev/wordstriker/
├── client/                    # Vue 3 + TypeScript SPA
│   ├── public/
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   │   └── index.ts       # Vue Router (lobby, game)
│   │   ├── views/
│   │   │   ├── LobbyView.vue  # Browse open games, create/join room
│   │   │   └── GameView.vue   # Main game screen
│   │   ├── components/
│   │   │   ├── GameCanvas.vue # Word projectile animations
│   │   │   ├── WordInput.vue  # Typing input
│   │   │   ├── ScoreBoard.vue # HP/score display
│   │   │   └── WordEffect.vue # Visual effects (from JavaFX "ping")
│   │   ├── composables/
│   │   │   ├── useAbly.ts     # Ably SDK wrapper (connect, pub/sub, presence)
│   │   │   └── useGame.ts     # Game state machine
│   │   ├── game/
│   │   │   ├── engine.ts      # Core game loop (requestAnimationFrame)
│   │   │   ├── word.ts        # Word projectile physics
│   │   │   └── protocol.ts    # Game message schemas + runtime validation
│   │   └── types/
│   │       └── index.ts       # Shared TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── planning.md
└── README.md
```

## 3. Ably Configuration

**Authentication:** Client-side API key with restricted capabilities — only `subscribe`, `publish`, and `presence` on channels matching `lobby` and `room:*`. No `channel-metadata`, no `push-admin`.

**Channel naming:**
| Channel | Purpose |
|---|---|
| `lobby` | Game discovery — players announce open games here |
| `room:{roomId}` | Per-game instance — all game messages flow here |

**API key restriction (Ably dashboard):**
```
Capabilities:
  lobby        → subscribe, presence
  room:*       → subscribe, publish, presence
```

This prevents a malicious client from publishing to `lobby` (spam prevention) or creating arbitrary channels, while allowing full game communication.

**SDK initialization:**
```typescript
const ably = new Ably.Realtime({
  key: import.meta.env.VITE_ABLY_API_KEY,
  clientId: generatePlayerId(),  // ephemeral per session
  closeOnUnload: true,
});
```

**No token server needed** — the restricted API key is safe for client-side use because capabilities are locked to specific channel patterns.

## 4. Rate Limiting & Abuse Prevention

Ably enforces account-level limits (500 msgs/s on free tier) but not per-client granular limits. Protection relies on three layers:

### Layer 1: Client-side throttle (send gate)
The `useAbly` composable queues messages and enforces a max throughput per frame:

```typescript
const sendQueue: GameMessage[] = [];
let lastSendTime = 0;
const MAX_MSGS_PER_SEC = 10;

function sendMessage(msg: GameMessage) {
  const now = Date.now();
  if (now - lastSendTime < 1000 / MAX_MSGS_PER_SEC) return; // drop
  lastSendTime = now;
  channel.publish("game", msg);
}
```

Honest clients obey this. A forked/malicious client can bypass it, but layers 2 and 3 mitigate that.

### Layer 2: Zod runtime validation (receive gate)
Every incoming message is parsed through a Zod discriminated union. Malformed or unexpected messages are silently dropped:

```typescript
const result = GameMessageSchema.safeParse(data);
if (!result.success) {
  console.warn("dropped invalid message", result.error.issues);
  return;
}
```

### Layer 3: Game state machine (gameplay gate)
The game state machine rejects messages that don't make sense:

- Can't `fire_word` during countdown or game-over phase
- Can't send `hit` for a `word_id` that doesn't exist in the current projectile list
- Duplicate `fire_word` for the same word is ignored
- `health_update` with `health` unchanged is ignored

```typescript
function handleFireWord(msg: FireWordMessage) {
  if (gamePhase.value !== "playing") return;
  if (projectiles.value.has(msg.word_id)) return;  // already exists
  if (!isValidWord(msg.word)) return;               // not in allowed list
  // ... process
}
```

## 5. Lobby & Game Discovery

No server needed — discovery uses a hardcoded channel (`lobby`) with Ably Presence.

### Flow

```
Player A (host):
  1. Subscribe to "lobby" channel
  2. Generate a random room_id (e.g. "abc123")
  3. Subscribe to "room:abc123"
  4. Enter presence on "lobby" → { name: "PlayerA", room_id: "abc123" }
  5. Publish { type: "game_open", room_id: "abc123", host: "PlayerA" }
  6. Wait for player B to join "room:abc123"

Player B (joiner):
  1. Subscribe to "lobby" channel
  2. Call presence.get("lobby") → see list of open games
  3. Pick a game → subscribe to "room:abc123"
  4. Enter presence on "room:abc123"
  5. Game begins
```

### Cleanup
- When host leaves, they leave `lobby` presence → other clients see the game disappear
- When either player leaves `room:abc123` presence, the game ends
- Rooms are ephemeral — no server-side state to clean

## 6. Message Protocol (Over Ably Channels)

All messages are JSON published to Ably channels. Every message is validated at both send and receive boundaries with Zod schemas.

### Lobby Messages (channel: `lobby`)

```typescript
// Published by host to announce a game
{ type: "game_open", room_id: string, host: string }
```

### Game Messages (channel: `room:{roomId}`)

```typescript
// Game initialization
{ type: "game_init", word_list: string[], seed: number, player_id: string }

// Player actions
{ type: "fire_word", word: string, word_id: string, timestamp: number }
{ type: "hit", word_id: string, timestamp: number }
{ type: "miss", word_id: string }

// State sync
{ type: "health_update", health: number }
{ type: "score_update", score: number }
{ type: "game_over", winner: string, stats: { ... } }
```

### Zod Runtime Validation

```typescript
import { z } from "zod";

const FireWordSchema = z.object({
  type: z.literal("fire_word"),
  word: z.string()
    .max(50)
    .regex(/^[a-zA-Z]+$/, "letters only")
    .transform(w => w.toLowerCase()),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
});

const HitSchema = z.object({
  type: z.literal("hit"),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
});

const MissSchema = z.object({
  type: z.literal("miss"),
  word_id: z.string().uuid(),
});

const HealthUpdateSchema = z.object({
  type: z.literal("health_update"),
  health: z.number().int().min(0).max(100),
});

const ScoreUpdateSchema = z.object({
  type: z.literal("score_update"),
  score: z.number().int().min(0),
});

const GameOverSchema = z.object({
  type: z.literal("game_over"),
  winner: z.string(),
  stats: z.object({
    words_typed: z.number(),
    accuracy: z.number().min(0).max(1),
    duration_sec: z.number().positive(),
  }),
});

const GameInitSchema = z.object({
  type: z.literal("game_init"),
  word_list: z.array(z.string().regex(/^[a-zA-Z]+$/).max(50)),
  seed: z.number().int(),
  player_id: z.string(),
});

export const GameMessageSchema = z.discriminatedUnion("type", [
  GameInitSchema,
  FireWordSchema,
  HitSchema,
  MissSchema,
  HealthUpdateSchema,
  ScoreUpdateSchema,
  GameOverSchema,
]);

export type GameMessage = z.infer<typeof GameMessageSchema>;

export function parseGameMessage(data: unknown): GameMessage | null {
  const result = GameMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

### XSS Prevention Strategy

1. **Zod schema gates** — every incoming message is parsed; malformed data is dropped, never processed
2. **Strict word validation** — `/^[a-zA-Z]+$/` prohibits HTML, script tags, unicode escapes
3. **Canvas rendering** — all game animations render via Canvas API (no HTML injection surface)
4. **DOM output** — any DOM text (nicknames, scores) uses `textContent`, never `innerHTML` or `v-html`
5. **No template interpolation** — Vue templates use `{{ }}` (escaped) not `v-html`

## 7. Data Flow

```
 Player A                    Ably                    Player B
    │                         │                         │
    │── pub lobby:game_open ─►│◄─ sub lobby:game_open ─│
    │                         │                         │
    │── sub room:abc123 ────►│◄── sub room:abc123 ────│
    │                         │                         │
    │── presence lobby ─────►│◄── presence lobby ─────│
    │                         │                         │
    │                         │                         │
    │── pub game_init ───────►│─── pub game_init ──────►│
    │◄─ pub game_init ───────│◄── pub game_init ───────│
    │                         │                         │
    │── pub fire_word ───────►│─── pub fire_word ──────►│
    │◄─ pub hit ─────────────│◄── pub hit ─────────────│
    │                         │                         │
    │── pub health_update ───►│─── pub health_update ──►│
    │                         │                         │
    │── pub game_over ───────►│─── pub game_over ──────►│
    │                         │                         │
    │◄─ leave presence ──────│──── leave presence ────►│
```

## 8. Application State Machine

```
         ┌──────────┐
         │  LOBBY   │
         └────┬─────┘
              │ host creates or joins room
              ▼
         ┌──────────┐
         │ WAITING  │ ← both players connected
         └────┬─────┘
              │ both ready
              ▼
         ┌──────────┐
         │ COUNTDOWN│ (3, 2, 1, GO)
         └────┬─────┘
              │
              ▼
         ┌──────────┐
         │ PLAYING  │ ──→ fire_word / hit / miss loop
         └────┬─────┘
              │ health reaches 0
              ▼
         ┌──────────┐
         │ GAME_OVER│
         └────┬─────┘
              │ rematch or back to lobby
              ▼
         ┌──────────┐
         │  LOBBY   │
         └──────────┘
```

## 9. Game Engine (Canvas)

Ported from JavaFX ping animation. Same behavior, different renderer.

**Word projectile properties:**
- `word`: string — the text to display
- `word_id`: uuid — unique identifier for hit/miss tracking
- `x, y`: number — current position (animating left-to-right)
- `speed`: number — pixels per frame (increases as match progresses)
- `color`: string — assigned per projectile for visual separation

**Game loop:**
```typescript
function gameLoop(timestamp: number) {
  const dt = timestamp - lastFrame;
  lastFrame = timestamp;

  for (const proj of projectiles) {
    proj.x += proj.speed * (dt / 16.67); // normalize to ~60fps
    if (proj.x > canvas.width) {
      // word reached the end → miss
      sendMiss(proj.word_id);
      removeProjectile(proj.word_id);
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}
```

**Ported JavaFX effects:**
- Gradient fill on word text
- Subtle reflection (faded copy below word)
- "Ping" indicator on successful hit (brief flash/scale on the word)

## 10. Implementation Phases

### Phase 1: Ably Setup + Lobby (Days 1-3)
- Create Ably account, restrict API key to `lobby subscribe+presence` and `room:* subscribe+publish+presence`
- Vite + Vue 3 + TypeScript scaffold
- `useAbly` composable (connect, pub/sub, presence)
- `LobbyView` — show open games via `presence.get("lobby")`, create game button
- **Deliverable:** Two browser tabs see each other in lobby

### Phase 2: Game Room + Connection (Days 3-5)
- Room channel subscribe/publish
- Both players join same `room:{roomId}` channel
- Presence detection (both connected → game ready)
- `GameView` skeleton with phase transitions
- **Deliverable:** Two tabs can start a game session

### Phase 3: Game Engine (Days 5-9)
- Canvas setup with `requestAnimationFrame` loop
- Word projectile physics (position, velocity, edge detection)
- Zod schema definitions + runtime validation for all message types
- Word input component with real-time validation (`/^[a-zA-Z]+$/`)
- **Deliverable:** Words animate across screen, typing fires them at opponent

### Phase 4: Full Game Protocol (Days 9-13)
- `game_init` with shared word list + seed
- `fire_word` / `hit` / `miss` round trip through Ably
- Health and score updates
- Endgame detection and `game_over` message
- Client-side throttle (10 msg/s per player)
- **Deliverable:** Complete game playable between two browser tabs

### Phase 5: Polish + Edge Cases (Days 13-17)
- Visual effects (gradient, reflection, hit flash)
- Disconnection detection via Ably presence leave
- Rematch flow
- Mobile/responsive layout
- Deploy to GitHub Pages with `vite build` → `client/dist/`
- **Deliverable:** Production-ready MVP on GitHub Pages

## 11. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Real-time relay | Ably | Managed edge network, no server to manage |
| Hosting | GitHub Pages | Free static hosting, zero ops |
| Build tool | Vite | Fast HMR, native TS/ESM |
| State management | Vue composables + reactive | Pinia overkill for this scale |
| Rendering | HTML Canvas | Word animation performance |
| Runtime validation | Zod | Type-safe parsing, XSS prevention |
| Room discovery | Hardcoded `lobby` channel + Presence | No server needed |
| Rate limiting | Client throttle + Zod + state machine | Server-free multi-layer defense |

## 12. GitHub Pages Deployment

```bash
cd client
npm run build   # outputs to client/dist/

# Deploy to GitHub Pages:
# - Set GitHub repo → Pages → Source: GitHub Actions
# - Or push client/dist/ to gh-pages branch
# - Or use: npm install -g gh-pages && gh-pages -d dist
```

**Env config:**
```env
VITE_ABLY_API_KEY=your_restricted_api_key
```

The API key is bundled in the JS but is scoped to only `lobby:subscribe+presence` and `room:*:subscribe+publish+presence` — no damage if exposed.

## 13. Testing Strategy

- **Vue components:** Vitest + Vue Test Utils
- **Zod schemas:** Unit tests for every schema (valid input passes, invalid input including HTML/script tags is rejected)
- **Game engine:** Pure function tests (word physics, collision, state transitions)
- **Ably integration:** Use Ably's test channel namespace or mock `ably-js` with `vitest-mock-extended`
- **E2E:** Two headless browser instances with Playwright, connecting through a test Ably app
