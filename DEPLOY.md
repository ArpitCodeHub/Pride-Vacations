# Pride Vacations — Vercel Deployment Guide

This project deploys to Vercel as a single static-React app plus one Node serverless function for the AI Concierge. There is no Python runtime in the deploy bundle.

## Architecture at a glance

- **Frontend**: Create-React-App SPA in `frontend/`. Builds to `frontend/build`. Vercel serves the static assets and rewrites all non-`/api/*` paths to `/index.html` so React Router's `BrowserRouter` survives hard refreshes.
- **API**: A single Vercel Node serverless function at `api/concierge.js` proxies the AI Concierge to OpenAI and persists conversation history to Supabase. Every other CRUD path (`/experiences`, `/stories`, `/leads`, `/admin/*`) is served by `@supabase/supabase-js` directly from the browser, with RLS enforcing admin gating.
- **Data**: A Supabase Postgres project hosts `experiences`, `travel_stories`, `leads_inquiries`, `admin_users`, and `conversations`. Provisioning is one-shot SQL — no runtime setup endpoint.

The legacy FastAPI backend in `backend/` stays in git history but is excluded from the Vercel build via `.vercelignore`.

## Required Vercel environment variables

Set these in the Vercel project settings (**Project → Settings → Environment Variables**). Choose `Production`, `Preview`, and `Development` scopes as appropriate.

### Build-time (frontend)

These are baked into the static bundle, so changing them requires a rebuild.

| Variable | Used by | Notes |
| --- | --- | --- |
| `REACT_APP_SUPABASE_URL` | `frontend/src/lib/supabase.js` | The `https://<project-ref>.supabase.co` URL of your Supabase project. |
| `REACT_APP_SUPABASE_ANON_KEY` | `frontend/src/lib/supabase.js` | The Supabase **anon (public)** key. Safe to expose in the browser. |

`REACT_APP_BACKEND_URL` is now optional. The Concierge function lives at the same origin as the SPA (relative `/api/concierge`), so leaving it unset is the recommended setup. If set to a non-empty value it is used as a prefix only for the `/api/concierge` URL — never for the Supabase calls.

### Server-side (function-only — never reaches the browser)

These are read at request time inside `api/concierge.js`. They are **not** prefixed with `REACT_APP_`, so React's build step never sees them.

| Variable | Used by | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | `api/concierge.js` | Standard OpenAI API key. Used for `gpt-4o-mini`. |
| `SUPABASE_URL` | `api/concierge.js` | Same URL as `REACT_APP_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/concierge.js` | Supabase **service role** key. Bypasses RLS so the function can read and write the `conversations` table. **Never expose this in the browser or in any response.** |

If any of the three server-side vars is missing at request time, `api/concierge.js` returns HTTP 500 with a generic `{"error":"Server misconfigured"}` body — the variable name itself is never leaked.

## Three-step operator runbook

1. **Apply the SQL migration.**
   - Open the Supabase Dashboard → **SQL Editor** → New query.
   - Paste the contents of `supabase/migrations/0001_vercel_migration.sql` and run it.
   - The migration is idempotent. Re-running it produces zero new rows in `experiences` and `travel_stories` and no policy errors.

2. **Provision the admin user.**
   - In Supabase Dashboard → **Authentication → Users → Add user**, create the admin account (e.g. `admin@pridevacations.in`) with **Email confirm** ticked.
   - In **SQL Editor**, find the new user's UUID (`select id from auth.users where email = 'admin@pridevacations.in';`) and insert a matching row:

     ```sql
     insert into public.admin_users (user_id, email, is_superadmin)
     values ('<paste-the-uuid>', 'admin@pridevacations.in', true);
     ```

   - That admin can now sign in at `/admin/login` and the RLS policies (`admin_select_leads`, `admin_update_leads`) grant them lead access.

3. **Deploy on Vercel.**
   - Set the five environment variables listed above (two build-time, three server-side).
   - Trigger a deploy. The repo-root `vercel.json` already declares the build command, output directory, and SPA rewrite. The `.vercelignore` ensures `backend/` and other non-deployable assets are excluded.
   - Confirm in the Vercel build log that no Python files appear in the function bundle, and that `frontend/build/index.html` is emitted.

## Local development

The frontend runs unchanged from before:

```sh
cd frontend
npm install
npm start
```

For local testing of `api/concierge.js`, use `vercel dev` from the repo root (requires the `vercel` CLI):

```sh
vercel dev
```

`vercel dev` reads `vercel.json` and serves both the SPA and the function on a single localhost origin, so the relative `/api/concierge` URL works the same way as in production.

## Rolling back

The migration is additive — no `DROP TABLE` statements. If you need to revert the deploy, simply redeploy a pre-migration commit. The `conversations` table and all rows in it remain in Supabase, so concierge history written during the migrated period is preserved.
