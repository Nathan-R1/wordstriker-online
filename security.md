# Security Review: WordStriker Architecture Plan

## CIA Triad Assessment

### Confidentiality

| Risk | Severity | Detail |
|---|---|---|
| API key in client bundle | High | `VITE_ABLY_API_KEY` is embedded in compiled JS. Anyone can extract it and connect to Ably with your account. Current scope limits damage to `room:* subscribe+publish`. |
| No end-to-end encryption | Medium | Ably can read all game messages. For a word game this is low-sensitivity, but worth noting. |
| Room ID brute-force | **Critical** | If `room_id` generation is weak (e.g. `Math.random().toString(36).slice(2,8)` ~2M combinations), an attacker can enumerate active rooms and spectate or inject messages. |
| Lobby presence visibility | Medium | Anyone can call `presence.get("lobby")` and see `{ name, room_id }` of every open game. |
| No authentication | **Critical** | No login, no session, no identity binding. Any client with the API key can join any room. |

### Integrity

| Risk | Severity | Detail |
|---|---|---|
| No authoritative game state | **Critical** | Game logic runs entirely in two browsers with no server arbitration. A malicious client can forge any message: `game_over`, `health_update: { health: 0 }`, false `hit` responses, etc. |
| No message signing | High | Messages are not signed or sequenced. A man-in-the-middle Ably client (same room) can replay captured messages or inject arbitrary valid-format messages. |
| State machine bypass | Medium | Layer 3 (state machine gate) prevents illegal transitions, but a client can send `health_update` that reduces opponent health to 0 in a single frame — the state machine would accept it (health 0-100 is in range). |
| Word list poisoning | High | `game_init.word_list` validation uses `regex(/^[a-zA-Z]+$/)` per word — but the host controls the word list. They could send all 1-letter words, giving themselves an impossible-to-miss advantage. |

### Availability

| Risk | Severity | Detail |
|---|---|---|
| No per-client rate limiting at Ably | High | Client-side throttle (Layer 1) is trivially bypassable. Ably's account-level limit (500 msg/s) is the only hard cap. A malicious client can saturate the account and deny service to all players. |
| Ably free tier limits | Medium | 500 msgs/s, 200 concurrent connections shared across all users. A targeted DoS could exhaust this. |
| No abuse monitoring | High | Zero logging or alerting on malicious behavior. You won't know you're under attack. |
| Room-id squatting | Medium | Attacker can create rooms with predictable IDs, occupying them and preventing legitimate games. |

---

## OWASP Top 10 (2021) Coverage

### A01: Broken Access Control — **FAIL**

No access control exists. Any client with the API key can:
- Subscribe to any `room:*` channel (and thus any active game)
- Publish to any `room:*` channel
- Read lobby presence data
- Join a game unsolicited

**Remediation:** At minimum, pair the room channel with a shared secret (the room code). The client should know the room code before subscribing. Even better: a lightweight token server that issues short-lived Ably tokens bound to specific room IDs.

### A02: Cryptographic Failures — **PASS with notes**

- TLS in transit (Ably enforces this)
- No E2E encryption — Ably sees plaintext game messages (acceptable for a word game)
- No secrets stored — acceptable for this threat model

### A03: Injection — **PARTIAL FAIL**

- `fire_word.word` properly restricted to `/^[a-zA-Z]+$/` — strong
- Canvas rendering eliminates HTML injection
- **Several unvalidated string fields:**
  - `game_open.host` (lobby) — no Zod schema at all
  - `game_over.winner` — typed as `z.string()` with no length or character limits
  - `game_init.player_id` — typed as `z.string()` with no constraints
  - `game_over.stats.*` — `words_typed`, `accuracy`, `duration_sec` all use bare `z.number()` without bounds

These fields, if ever rendered to DOM (e.g. lobby shows host name, game over screen shows winner), are injection vectors.

### A04: Insecure Design — **FAIL**

The fundamental design flaw: **there is no trusted authority.** The game protocol implicitly trusts both clients to:
- Report their own health truthfully
- Generate correct hit/miss results
- Follow the game loop in order
- Maintain game timer

A forked client breaks all of these. This is the biggest architectural risk.

### A05: Security Misconfiguration — **PASS**

API key scope is well-designed. No other config risks identified.

### A06: Vulnerable & Outdated Components — **PASS with notes**

Standard npm supply chain risk. Mitigated by:
- Minimal dependency surface
- `npm audit` / Dependabot in CI
- No runtime server to exploit

### A07: Identification & Authentication Failures — **FAIL**

- No user identity at all
- `clientId` is ephemeral, client-generated, and forgeable
- No rate limiting tied to identity
- No reputation system
- No way to ban/block abusive players

### A08: Software & Data Integrity — **PASS**

Static site on GitHub Pages is tamper-proof at the server level. npm supply chain is standard risk.

### A09: Security Logging & Monitoring — **FAIL**

- No logging of invalid messages, flooding attempts, or abuse patterns
- No alerting
- No audit trail

While acceptable for an MVP, this should have a note about productionization.

### A10: SSRF — **N/A**

No server.

---

## Additional Findings

### Profanity / Nasty Words

| Vector | Risk |
|---|---|
| Game words (`fire_word.word`) | Allowed by `/^[a-zA-Z]+$/` — profanity passes. Rendered to Canvas. |
| Host names (`game_open.host`) | No validation at all. If rendered in lobby UI, any string displays. |
| Winner name (`game_over.winner`) | No validation. Rendered on game-over screen. |
| Player IDs (`game_init.player_id`) | No validation. |

A client could send profane words via `fire_word` — they'd render in the opponent's Canvas. Not an XSS risk (Canvas is safe) but a content moderation concern.

**Remediation:** Add a profanity filter (or at least a blocklist) for user-visible strings. The game word dictionary should be pre-approved (drawn from a curated word list, not user input).

### Replay Attacks

Messages have no sequence numbers, nonces, or timestamps with tolerance windows. A captured `hit` or `health_update` could be replayed to affect game state. Low likelihood in practice (room channels are ephemeral), but architecturally absent.

### Room ID Entropy

The plan says "generate a random room_id (e.g. `abc123`)" — this example is only 6 alphanumeric chars. If generated with `Math.random()` (weak RNG), an attacker can:

- Enumerate ~50K active room IDs in 6 minutes at 140 req/s
- Join games uninvited
- Spam/flood active games

**Remediation:** Use `crypto.randomUUID()` (36 chars) or at minimum 16+ chars of `crypto.getRandomValues()`.

---

## Summary Table

| Category | Grade | Key Fix Needed |
|---|---|---|
| Confidentiality | C | Room ID entropy, API in client bundle, no auth |
| Integrity | D | No authoritative game server, no message signing |
| Availability | D | No server-side rate limiting, no abuse monitoring |
| Access Control | F | Any API key holder can join any room |
| Injection | B+ | Most vectors covered, 4 unvalidated string fields |
| Authentication | F | Zero identity/trust infrastructure |
| Logging/Monitoring | F | None |

## Top 3 Highest-Impact Fixes

1. **Authoritative game server (or hybrid)** — Even a lightweight relay server that validates game state transitions, rate-limits per client, and signs messages would fix ~70% of the critical issues. The current trust-every-client model is the root cause of most CIA failures.

2. **Room-level access control** — Either a token server issues per-room credentials, or the room code itself gates channel access. Combine with high-entropy room IDs (`crypto.randomUUID()`).

3. **Server-side rate limiting** — The client-side throttle is decorative. A 50-line Cloudflare Worker that issues Ably tokens with per-client rate caps transforms availability from D to B.

Without these, the game works in a trustful environment (friends playing each other), but is trivially exploitable by any technically capable player.
