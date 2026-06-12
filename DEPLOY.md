# Pride Vacations — Vercel Deployment Guide

This project deploys to Vercel as a single static SPA (Vite + React) plus one Node serverless function for the AI Concierge. There is no Python runtime in the deploy bundle, and no custom build commands — Vercel's Vite preset does everything.

## Architecture at a glance

- **Frontend**: Vite + React SPA at the repo root. Vercel's Vite preset auto-detects it, runs `vite build`, and outputs to `dist/`. Non-`/api/*` paths fall back to `/index.html` so React Router's `BrowserRouter` survives hard refreshes.
- **API**: A single Vercel Node serverless function at `api/concierge.js` proxies the AI Concierge to OpenAI and persists conversation history to Supabase. Every other CRUD path (`/experiences`, `/stories`, `/leads`, `/admin/*`) is served by `@supabase/supabase-js` directly from the browser, with RLS enforcing admin gating.
- **Data**: A Supabase Postgres project hosts `experiences`, `travel_stories`, `leads_inquiries`, `admin_users`, and `conversations`. Provisioning is one-shot SQL — no runtime setup endpoint.

The legacy Python FastAPI backend in `backend/` stays in git history but is excluded from the Vercel build via `.vercelignore`.

## Required Vercel environment variables

Set these in the Vercel project settings (**Project → Settings → Environment Variables**). Choose `Production`, `Preview`, and `Development` scopes as appropriate.

### Build-time (frontend, exposed to the browser)

These are baked into the static bundle by Vite, so changing them requires a rebuild.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | The `https://<project-ref>.supabase.co` URL of your Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | The Supabase **anon (public)** key. Safe to expose in the browser. |

`VITE_BACKEND_URL` is optional and ignored when blank. The Concierge function lives at the same origin as the SPA (relative `/api/concierge`), so leaving it unset is the recommended setup.

### Server-side (function-only — never reaches the browser)

These are read at request time inside `api/concierge.js`. They are **not** prefixed with `VITE_`, so Vite's build never inlines them into the client bundle.

| Variable | Used by | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | `api/concierge.js` | Standard OpenAI API key. Used for `gpt-4o-mini`. |
| `SUPABASE_URL` | `api/concierge.js` | Same URL as `VITE_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/concierge.js` | Supabase **service role** key. Bypasses RLS so the function can read and write the `conversations` table. **Never expose this in the browser or in any response.** |

If any of the three server-side vars is missing at request time, `api/concierge.js` returns HTTP 500 with a generic `{"error":"Server misconfigured"}` body — the variable name itself is never leaked.

## Three-step operator runbook

1. **Apply the SQL migration.**
   - Open the Supabase Dashboard → **SQL Editor** → New query.
   - Paste the contents of `supabase/migrations/0001_vercel_migration.sql` and run it.
   - The migration is idempotent. Re-running it produces zero new rows in `experiences` and `travel_stories` and no policy errors.

2. **Provision the admin user.**
   - **For Google OAuth (Recommended):** Follow the detailed setup guide in `ADMIN_SETUP.md`
   - **Quick start:**
     - Enable Google provider in Supabase Dashboard → Authentication → Providers
     - Configure OAuth credentials and redirect URLs
     - Sign in at `/admin/login` with Google
     - Link the user to admin access via SQL Editor:
       ```sql
       insert into public.admin_users (user_id, email, is_superadmin)
       values ('<google-user-uuid>', 'team@zenuratech.online', true);
       ```
   - **Email/Password fallback:** In Supabase Dashboard → Authentication → Users → Add user, create the admin account (e.g. `admin@pridevacations.in`) with **Email confirm** ticked, then link via SQL as shown above.
   - That admin can now sign in at `/admin/login` and the RLS policies (`admin_select_leads`, `admin_update_leads`) grant them lead access.
   - **See `ADMIN_SETUP.md` for detailed instructions and troubleshooting.**

3. **Deploy on Vercel.**
   - Set the five environment variables listed above (two build-time, three server-side).
   - Trigger a deploy. Vercel auto-detects Vite from `package.json`, runs `npm install && npm run build`, deploys the contents of `dist/`, and registers `api/concierge.js` as a serverless function.
   - **No `vercel.json` is required.** The Vite preset includes the SPA fallback (rewrite to `/index.html`) automatically. If you ever need to override anything, add a minimal `vercel.json` at the repo root.

## Local development

Frontend dev server (Vite, hot reload):

```sh
npm install
npm run dev
```

This serves the SPA at `http://localhost:3000` with live reload. The AI Concierge endpoint will not respond locally because `npm run dev` does not run serverless functions — for that, use `vercel dev` from the repo root (requires the `vercel` CLI), which serves both the SPA and `api/concierge.js` on a single localhost origin so the relative `/api/concierge` URL works the same way as in production.

Tests:

```sh
npm test          # frontend api.js facade tests (Vitest, 12 tests)
npm run test:api  # api/concierge.js function tests (node --test, 6 tests)
```

Production build (what Vercel runs):

```sh
npm run build     # outputs to dist/
npm run preview   # serves the built dist/ locally
```

## Rolling back

The migration is additive — no `DROP TABLE` statements. If you need to revert the deploy, simply redeploy a pre-migration commit. The `conversations` table and all rows in it remain in Supabase, so concierge history written during the migrated period is preserved.
