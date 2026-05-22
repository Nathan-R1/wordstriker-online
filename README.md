# WordStriker Online

1v1 multiplayer Bible verse game. Send verses from the King James Version to your opponent. Clear incoming verses by identifying their book/chapter/verse reference before time runs out. Static SPA — no backend. Communication via Supabase Realtime.

Built with Vue 3, TypeScript, Supabase Realtime, Zod, and Vite.

## How to Play

**Objective:** Clear incoming verses by guessing their reference. Send verses to your opponent by typing the verse text.

**Getting started:**
1. Open the app — you're signed in anonymously and placed in the lobby.
2. Click **Invite** on another player to start a game.
3. The host navigates to the game room immediately; the joiner accepts to join.

**Sending verses:**
- Type at least 3 words of any KJV verse in the input box and press Enter.
- The game matches against the full KJV text (ordered phrase match).
- The verse is sent to your opponent with a countdown timer — longer verses get less time (3 words: 60s, 13+ words: 10s).
- Verse text appears on the opponent's screen, but **the book/chapter/verse reference is hidden**.

**Clearing verses:**
- Type a reference to clear all matching incoming verses:
  - **Book name only** (e.g. `John`) — 1 point per verse
  - **Book + chapter** (e.g. `John 3`) — 2 points per verse
  - **Full reference** (e.g. `John 3:16`) — 5 points per verse
- Cleared verses are removed from your incoming list and added to the feed panel on the right.

**Scoring:**
- Your score and your opponent's score are shown at the top.
- Points are awarded per-verse based on the precision of your guess: 1/2/5 points.
- Clearing multiple verses with a single reference awards points × number of matched verses.

**Feed panel:**
- Shows a chronological list of cleared verses with who cleared them and the reference.

## Local development

```bash
cd client
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server hot-reloads on changes.

### Build for production

```bash
cd client
npm run build          # outputs to client/dist/
```

## Deploy to GitHub Pages

### Automatic (CI)

Push to `main` — the workflow at `.github/workflows/deploy.yml` runs automatically.

**Before first push**, configure in your GitHub repo:

1. **Secrets** — `Settings → Secrets and variables → Actions` — add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your anon key

2. **Pages** — `Settings → Pages`:
   - Source: "Deploy from a branch"
   - Branch: `gh-pages`

The workflow:
- Checks out the repo
- Installs dependencies with `npm ci` (exact versions from lockfile)
- Injects Supabase env vars from secrets
- Runs `npm run build`
- Pushes `client/dist/` to the `gh-pages` branch using `peaceiris/actions-gh-pages`

### Manual (no CI)

```bash
cd client
npm run build
npx gh-pages -d dist
```

Requires `GITHUB_TOKEN` or SSH access configured on your machine.

### Environment variables

| Variable | Required | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase project → Settings → API (the publishable anon key) |

### Supabase setup

- Anonymous auth must be enabled: `Authentication → Providers → Anonymous → Enable`
- No database tables required — only Realtime pub/sub and presence are used.
- Rate limit may be hit during development (free tier: ~30 requests/min). The app caches the auth session across page loads to minimize calls.
