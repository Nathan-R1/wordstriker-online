# WordStriker Online

1v1 multiplayer Bible verse game. Static SPA — no backend. Communication via Supabase Realtime.

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
- Rate limit may be hit during development (free tier: ~30 requests/min). The app caches the auth session across page loads to minimize calls.
