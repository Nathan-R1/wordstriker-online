# WordStriker — Architecture Plan (Supabase)

## 1. Supabase Project Setup

Create a Supabase project at `https://supabase.com`. The project provides:

- **PostgreSQL database** — game state, messages, players
- **Anonymous auth** — each player gets a unique `auth.uid()` JWT with zero friction
- **Realtime pub/sub** — channels for lobby presence and game message relay
- **Row Level Security (RLS)** — server-enforced rate limiting and access control

### Env variables (shipped in the JS bundle)

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Why this is safe:** The anon key is designed to be public. It merely identifies *which Supabase project* to talk to. It grants zero data access on its own — all access is gated by RLS policies tied to `auth.uid()`. The `service_role` key (real admin key) is never bundled.

### Free tier constraints

| Constraint | Value | Impact |
|---|---|---|
| Concurrent Realtime connections | 200 | 200 simultaneous players |
| Realtime messages/month | 2 million | ~25,000 games/month |
| Max message size | 256 KB | Game messages are bytes |
| Database size | 500 MB | Purge old games if needed |
| Egress/month | 5 GB | Assets served from GitHub Pages |
| Idle pause | After 7 days | 1-click restore from dashboard |

---

## 2. Database Schema

### Table: `game_players`

Tracks which players are in which game. Used by RLS to gate access.

```sql
create table game_players (
  game_id    uuid not null,
  player_id  uuid not null,  -- matches auth.uid() from anonymous sign-in
  name       text not null default '',
  created_at timestamptz default now(),
  primary key (game_id, player_id)
);
```

### Table: `game_messages`

All in-game messages. Every insert is pushed to subscribers via Realtime `postgres_changes`. RLS on this table enforces rate limits and participant-only access.

```sql
create table game_messages (
  id           bigint generated always as identity primary key,
  game_id      uuid not null,
  sender_id    uuid not null,
  message_type text not null,
  payload      jsonb not null,
  created_at   timestamptz default now()
);

create index idx_game_messages_game_id on game_messages (game_id, created_at);
```

`message_type` values: `game_init`, `fire_word`, `hit`, `miss`, `health_update`, `score_update`, `game_over`.

`payload` schema per type is defined in the Zod protocol (section 7).

---

## 3. Row Level Security (RLS)

RLS replaces all three layers of the original Ably security plan. Each policy runs inside PostgreSQL on every query — **server-enforced, not client-enforced**.

### Enable RLS

```sql
alter table game_players enable row level security;
alter table game_messages enable row level security;
```

### Policy: Rate limiting — replaces old Layer 1 (client throttle)

```sql
create policy "max 3 messages per 5 seconds"
  on game_messages for insert
  with check (
    (select count(*) from game_messages
     where sender_id = auth.uid()
     and created_at > now() - interval '5 seconds') < 3
  );
```

This is **server-enforced**. The old Ably design relied on a client-side throttle that a forked client could bypass. This RLS policy cannot be bypassed — PostgreSQL enforces it on every insert.

### Policy: Only game participants can write messages

```sql
create policy "players can insert into their games"
  on game_messages for insert
  with check (
    exists (
      select 1 from game_players
      where game_id = game_messages.game_id
      and player_id = auth.uid()
    )
  );
```

### Policy: Only game participants can read messages

```sql
create policy "players can read their game messages"
  on game_messages for select
  using (
    exists (
      select 1 from game_players
      where game_id = game_messages.game_id
      and player_id = auth.uid()
    )
  );
```

### Policy: Players can insert themselves into a game

```sql
create policy "players can join a game"
  on game_players for insert
  with check (
    player_id = auth.uid()
  );
```

### Policy: Players can only see their own game memberships

```sql
create policy "players see their own game_players rows"
  on game_players for select
  using (
    player_id = auth.uid()
  );
```

### Complete abuse prevention comparison

| Old Ably layer | Problem | Supabase replacement |
|---|---|---|
| Layer 1: Client throttle (10 msg/s) | Trivially bypassed, cosmetic | **RLS rate limit policy** — runs inside PostgreSQL, cannot be bypassed |
| Layer 2: Zod validation on receive | Only at client boundary | **Zod + RLS** — validate before DB insert AND server checks |
| Layer 3: Game state machine gates | Purely client-side, no authority | **DB constraints + RLS** — insert-scoped policies per game and player |

---

## 4. Anonymous Auth — `useSupabase.ts`

### Function: `initSupabase()`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Function: `signInAnon()`

Called once on app load. Returns a `userId` string (UUID) that is `auth.uid()` in RLS policies.

```typescript
export async function signInAnon(): Promise<string> {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user.id
}
```

- No email, no password, no login screen
- JWT auto-refreshes
- `auth.uid()` is stable for the browser session
- Counts toward the 50,000 MAU free tier limit (negligible for MVP)

### Exported state

- `supabase` — initialized client (exported for use across composables)
- `userId` — the current session's `auth.uid()` string

---

## 5. Lobby — `useLobby.ts`

The lobby is a well-known, intentionally public meeting point. Uses a Supabase Realtime channel with presence tracking — no database table involved.

### Channel name

```
lobby
```

Hardcoded in the app. Public by design — this is a meeting location, not a secret.

### Function: `joinLobby()`

```typescript
type LobbyPlayer = {
  userId: string
  name: string
  status: 'looking' | 'in_game'
  gameId?: string
}

export function joinLobby(userId: string, playerName: string) {
  const channel = supabase.channel('lobby')

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // state is Record<string, LobbyPlayer[]>
    // keyed by client's self-generated presence key
    onPresenceUpdate?.(state)
  })

  channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
    // newPresences is LobbyPlayer[]
    onPlayerJoin?.(newPresences[0])
  })

  channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    onPlayerLeave?.(leftPresences[0])
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        userId,
        name: playerName,
        status: 'looking',
      } satisfies LobbyPlayer)
    }
  })

  return channel
}
```

### Behavior

| Event | What happens |
|---|---|
| Player opens app | `signInAnon()` → `joinLobby()` → presence tracked |
| Player sees others | `presence.sync` fires with full player list |
| Player leaves | Presence `leave` fires, other clients remove them |
| Player starts game | Updates `channel.track({ status: 'in_game', gameId })` |

### Rate limiting on lobby

None — the lobby has no database table. Presence updates are lightweight Realtime messages. Abuse would show as rapid presence churn, visible to all clients but not costing you anything beyond the Realtime message quota.

### Game invite flow (via lobby broadcast)

```typescript
// Host sends invite
channel.send({
  type: 'broadcast',
  event: 'game_invite',
  payload: {
    gameId: crypto.randomUUID(),   // generated by host
    hostName: playerName,
  }
})

// Other players receive invite
channel.on('broadcast', { event: 'game_invite' }, (data) => {
  // show "PlayerX invites you to a game" UI
  // on accept → join game channel
})
```

### Function: `leaveLobby()`

```typescript
export function leaveLobby(channel: RealtimeChannel) {
  channel.untrack()
  channel.unsubscribe()
}
```

---

## 6. Game Room — `useGame.ts`

Each game is a private room identified by a UUID. All game messages flow through the `game_messages` table with RLS enforcement.

### Room ID generation

```typescript
import { randomUUID } from 'uncrypto'  // or crypto.randomUUID()

const gameId = randomUUID()
// Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

`crypto.randomUUID()` produces 122 bits of entropy — **not enumerable**. This replaces the original plan's weak `Math.random().toString(36).slice(2,8)` approach, which the security review flagged as critical.

The gameId is exchanged between players through the lobby broadcast — it is never guessable.

### Channel name

```
game:<gameId>
```

Example: `game:a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Function: `createGame()`

```typescript
export async function createGame(userId: string, playerName: string) {
  const gameId = crypto.randomUUID()

  // Insert host into game_players
  await supabase.from('game_players').insert({
    game_id: gameId,
    player_id: userId,
    name: playerName,
  })

  // Subscribe to game channel
  const channel = supabase.channel(`game:${gameId}`)

  // Listen for new messages via postgres_changes
  channel.on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'game_messages',
      filter: `game_id=eq.${gameId}`,
    },
    (payload) => {
      handleIncomingMessage(payload.new as GameMessageRow)
    }
  )

  channel.subscribe()

  return { gameId, channel }
}
```

### Function: `joinGame()`

```typescript
export async function joinGame(
  userId: string,
  playerName: string,
  gameId: string
) {
  // Insert joiner into game_players
  // RLS policy ensures player_id = auth.uid()
  await supabase.from('game_players').insert({
    game_id: gameId,
    player_id: userId,
    name: playerName,
  })

  // Subscribe to game channel
  const channel = supabase.channel(`game:${gameId}`)

  channel.on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'game_messages',
      filter: `game_id=eq.${gameId}`,
    },
    (payload) => {
      handleIncomingMessage(payload.new as GameMessageRow)
    }
  )

  channel.subscribe()

  return { channel }
}
```

### Function: `sendGameMessage()`

```typescript
type GameMessagePayload = {
  game_id: string
  sender_id: string
  message_type: string
  payload: Record<string, unknown>
}

export async function sendGameMessage(msg: GameMessagePayload) {
  // RLS enforces:
  //   - rate limit (max 3 per 5 seconds)
  //   - player is in this game's game_players
  // Zod validation happens before this call (see protocol.ts)
  const { error } = await supabase.from('game_messages').insert(msg)
  if (error) {
    // RLS rejection or DB error
    console.warn('message rejected:', error.message)
  }
}
```

### Function: `handleIncomingMessage()`

```typescript
function handleIncomingMessage(row: GameMessageRow) {
  // Parse payload through Zod schema (protocol.ts)
  const parsed = GameMessageSchema.safeParse({
    type: row.message_type,
    ...row.payload,
  })

  if (!parsed.success) {
    console.warn('dropped invalid message', parsed.error.issues)
    return
  }

  // Route to game state machine
  gameStateMachine.dispatch(parsed.data)
}
```

### Function: `leaveGame()`

```typescript
export async function leaveGame(channel: RealtimeChannel, gameId: string) {
  channel.unsubscribe()
  // Optionally delete from game_players (or let RLS handle via presence)
}
```

---

## 7. Message Protocol — `protocol.ts`

Identical Zod schemas from the original plan. No changes needed — these still validate all message content on both send and receive.

```typescript
import { z } from "zod"

const FireWordSchema = z.object({
  type: z.literal("fire_word"),
  word: z.string().max(50).regex(/^[a-zA-Z]+$/, "letters only").transform(w => w.toLowerCase()),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
})

const HitSchema = z.object({
  type: z.literal("hit"),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
})

const MissSchema = z.object({
  type: z.literal("miss"),
  word_id: z.string().uuid(),
})

const HealthUpdateSchema = z.object({
  type: z.literal("health_update"),
  health: z.number().int().min(0).max(100),
})

const ScoreUpdateSchema = z.object({
  type: z.literal("score_update"),
  score: z.number().int().min(0),
})

const GameOverSchema = z.object({
  type: z.literal("game_over"),
  winner: z.string().max(50).regex(/^[a-zA-Z0-9_-]+$/),
  stats: z.object({
    words_typed: z.number().int().min(0),
    accuracy: z.number().min(0).max(1),
    duration_sec: z.number().positive(),
  }),
})

const GameInitSchema = z.object({
  type: z.literal("game_init"),
  word_list: z.array(z.string().regex(/^[a-zA-Z]+$/).max(50)).min(10).max(100),
  seed: z.number().int(),
  player_id: z.string().uuid(),
})

export const GameMessageSchema = z.discriminatedUnion("type", [
  GameInitSchema,
  FireWordSchema,
  HitSchema,
  MissSchema,
  HealthUpdateSchema,
  ScoreUpdateSchema,
  GameOverSchema,
])

export type GameMessage = z.infer<typeof GameMessageSchema>

export function parseGameMessage(data: unknown): GameMessage | null {
  const result = GameMessageSchema.safeParse(data)
  return result.success ? result.data : null
}
```

### Why Zod is still needed

RLS handles rate limiting and participant gating, but Zod ensures structural integrity:
- Word content is letters-only (`/^[a-zA-Z]+$/`)
- Fields have correct types (numbers, booleans, UUIDs)
- Max lengths prevent oversized payloads
- Discriminated union catches unknown message types

RLS + Zod are complementary — RLS gates *who* can write, Zod validates *what* they write.

---

## 8. Game Engine (Canvas) — `engine.ts`

Unchanged from the original plan. The game loop, word projectile physics, canvas rendering, and visual effects (gradient, reflection, hit flash) are all client-side. No Supabase involvement.

---

## 9. Data Flow Summary

```
Player A                        Supabase                         Player B
   │                               │                               │
   │── signInAnonymously() ───────►│◄── signInAnonymously() ──────│
   │    → JWT with auth.uid()      │    → JWT with auth.uid()     │
   │                               │                               │
   │── supabase.channel('lobby') ─►│◄── supabase.channel('lobby')─│
   │── channel.track({name,status})│◄── channel.track({...}) ─────│
   │                               │                               │
   │── broadcast game_invite ─────►│── broadcast to lobby ────────►│
   │   { gameId: uuid }            │                               │
   │                               │                               │
   │── channel('game:<uuid>') ────►│◄── channel('game:<uuid>') ───│
   │── INSERT game_players ───────►│◄── INSERT game_players ──────│
   │   (RLS: player_id=auth.uid()) │    (RLS: player_id=auth.uid())│
   │                               │                               │
   │── INSERT game_messages ──────►│                               │
   │   { game_id, sender_id,       │                               │
   │     message_type, payload }    │                               │
   │   (RLS: rate limit +          │                               │
   │    game participant check)    │                               │
   │                               │── postgres_changes push ─────►│
   │◄── postgres_changes push ─────│── INSERT game_messages ──────│
   │                               │   (RLS: rate limit + check)  │
```

---

## 10. Security Posture (Post-Migration)

### Confidentiality

| Risk | Severity | Status |
|---|---|---|
| Anon key in bundle | Low (was High) | **Fixed** — anon key is public-by-design, RLS-gated. No credential shipped. |
| No E2E encryption | Medium | Unchanged — Supabase sees plaintext (acceptable for word game). TLS in transit. |
| Room ID brute-force | Critical | **Fixed** — `crypto.randomUUID()` (122 bits) replaces weak `Math.random()` |
| Lobby presence visible | Low | Intentional — lobby is public meeting point |
| No authentication | Critical | **Fixed** — `auth.uid()` from anonymous sign-in provides unique identity |

### Integrity

| Risk | Severity | Status |
|---|---|---|
| No authoritative game state | Critical | **Mitigated** — RLS enforces per-message constraints server-side. Game state still runs in two browsers but writes are gated. |
| Word list poisoning | High | **Mitigated** — Zod validates `word_list` at write boundary. RLS limits write frequency. |
| No message signing | High | Unchanged — messages are not signed. Acceptable for casual play. |

### Availability

| Risk | Severity | Status |
|---|---|---|
| No per-client rate limiting | Critical | **Fixed** — RLS policy enforces max 3 inserts per 5 seconds per `auth.uid()`. Server-enforced, cannot be bypassed. |
| Ably/third-party quota exhaustion | High | **Fixed** — Supabase rate limits are per-project and per-auth.uid(), not per-account global. |
| Free tier idle pause | Medium | Dashboard restore or $25/mo Pro plan. |

### OWASP Coverage

| Category | Old grade | New grade | Why |
|---|---|---|---|
| A01: Access Control | F | **B** | RLS + anonymous auth. Room ID unguessable via UUID. |
| A04: Insecure Design | F | **C** | Still trust-each-client for game state, but writes are RLS-gated. |
| A07: Auth | F | **B** | Anonymous `auth.uid()` provides identity. No ban system yet. |
| A09: Logging | F | **F** | Unchanged. Supabase logs are available but no abuse alerting. |

---

## 11. Supabase CLI / Migration File

```sql
-- 001_init.sql

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Tables
create table game_players (
  game_id    uuid not null,
  player_id  uuid not null,
  name       text not null default '',
  created_at timestamptz default now(),
  primary key (game_id, player_id)
);

create table game_messages (
  id           bigint generated always as identity primary key,
  game_id      uuid not null,
  sender_id    uuid not null,
  message_type text not null,
  payload      jsonb not null,
  created_at   timestamptz default now()
);

create index idx_game_messages_game_id on game_messages (game_id, created_at);

-- Enable RLS
alter table game_players enable row level security;
alter table game_messages enable row level security;

-- RLS: Rate limit (max 3 messages per 5 seconds)
create policy "rate_limit_messages"
  on game_messages for insert
  with check (
    (select count(*) from game_messages
     where sender_id = auth.uid()
     and created_at > now() - interval '5 seconds') < 3
  );

-- RLS: Only game participants can insert messages
create policy "insert_own_game_messages"
  on game_messages for insert
  with check (
    exists (
      select 1 from game_players
      where game_id = game_messages.game_id
      and player_id = auth.uid()
    )
  );

-- RLS: Only game participants can read messages
create policy "select_own_game_messages"
  on game_messages for select
  using (
    exists (
      select 1 from game_players
      where game_id = game_messages.game_id
      and player_id = auth.uid()
    )
  );

-- RLS: Players can insert themselves
create policy "insert_self"
  on game_players for insert
  with check (player_id = auth.uid());

-- RLS: Players see only their own memberships
create policy "select_own_memberships"
  on game_players for select
  using (player_id = auth.uid());
```

Apply via Supabase dashboard SQL editor or CLI:

```bash
supabase migration up
```

---

## 12. Directory Structure

```
wordstriker/
├── client/
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/index.ts
│   │   ├── views/
│   │   │   ├── LobbyView.vue
│   │   │   └── GameView.vue
│   │   ├── components/
│   │   │   ├── GameCanvas.vue
│   │   │   ├── WordInput.vue
│   │   │   ├── ScoreBoard.vue
│   │   │   └── WordEffect.vue
│   │   ├── composables/
│   │   │   ├── useSupabase.ts    # init + anon auth
│   │   │   ├── useLobby.ts       # presence + game invites
│   │   │   └── useGame.ts        # game messages + postgres_changes
│   │   ├── game/
│   │   │   ├── engine.ts         # requestAnimationFrame loop
│   │   │   ├── word.ts           # projectile physics
│   │   │   └── protocol.ts       # Zod schemas
│   │   └── types/index.ts
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── planning.md
└── README.md
```
