# Requirements Document

## Introduction

The Pride Vacations project currently fails to load on Vercel (HTTP 404) because the React SPA lives in `frontend/` with no `vercel.json`, no SPA rewrites, and a Python FastAPI backend that Vercel cannot host as configured. This feature migrates the project to a Vercel-native shape: the React app builds and serves from `frontend/build`, all data CRUD calls move to Supabase directly with RLS enforcing admin gating, the AI concierge moves to a single Vercel Node.js serverless function backed by a new Supabase `conversations` table, and a one-time SQL migration replaces the runtime `/api/setup/*` endpoints.

The migration MUST produce zero visible UI change and zero functional regression. The `src/lib/api.js` facade keeps its public surface so component code is untouched. The Python backend and MongoDB are removed from the deploy path. Existing frontend env var names (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_BACKEND_URL`) remain valid.

## Glossary

- **Repository**: The git repository at the workspace root containing `frontend/`, `backend/`, `vercel.json`, and the SQL migration file.
- **Vercel_Deployment**: The deployed Vercel project that builds and serves the SPA and the `/api/*` serverless functions.
- **Frontend_Client**: The Create-React-App SPA built from `frontend/` (react-scripts 5, react-router-dom v6 BrowserRouter).
- **API_Facade**: The module `frontend/src/lib/api.js` that exposes the `api` object (`api.get`, `api.post`, `api.patch`) used by all components and pages.
- **Supabase_Client**: The `@supabase/supabase-js` client exported from `frontend/src/lib/supabase.js`.
- **Supabase_Database**: The Supabase Postgres instance hosting the `experiences`, `travel_stories`, `leads_inquiries`, `admin_users`, and new `conversations` tables, with RLS enabled.
- **Concierge_Function**: The Vercel Node.js serverless function at `api/concierge.js` that proxies chat requests to OpenAI and persists conversation history in `Supabase_Database`.
- **SQL_Migration**: A single SQL file in the `Repository` that the operator runs once in the Supabase SQL Editor to create or update tables, RLS policies, and seed data; replaces the legacy `/api/setup/*` runtime endpoints.
- **Admin_Session**: A Supabase Auth session whose `auth.uid()` matches a row in `admin_users.user_id`.
- **Anon_Session**: A Supabase Auth context using only the public anon key, with no signed-in user.
- **Endpoint_Parity**: For every legacy path under `/api/*` listed in this document, calling code in the `Frontend_Client` (via the `API_Facade`) receives the same response shape and semantics as before the migration.

## Requirements

### Requirement 1: Vercel Deployability

**User Story:** As a deployer, I want the project to deploy and serve the SPA on Vercel without 404s, so that pridevacations.in renders the homepage.

#### Acceptance Criteria

1. THE Repository SHALL contain a `vercel.json` file at the repository root.
2. THE Repository SHALL configure `vercel.json` to build from the `frontend/` directory using the Create-React-App preset and emit static assets to `frontend/build`.
3. WHEN the Vercel_Deployment receives an HTTP GET for any path that does not begin with `/api/` and does not match a static asset under `frontend/build`, THE Vercel_Deployment SHALL respond with the contents of `frontend/build/index.html` and HTTP status 200.
4. WHEN the Vercel_Deployment receives an HTTP GET for `/`, THE Vercel_Deployment SHALL respond with HTTP status 200 and the contents of `frontend/build/index.html`.
5. THE Repository SHALL exclude the `backend/` directory and any Python runtime configuration from the Vercel build, so that no Python code is deployed.
6. THE Repository SHALL declare `api/concierge.js` as the only Vercel serverless function under the `/api/` namespace.

### Requirement 2: Public Read Endpoint Parity

**User Story:** As a website visitor, I want experience and story pages to load with the same content, so that the public site renders unchanged after the migration.

#### Acceptance Criteria

1. WHEN the Frontend_Client calls `api.get('/experiences')`, THE API_Facade SHALL return a response object whose `data` field is an array of experience records ordered by `sort_order` ascending.
2. WHEN the Frontend_Client calls `api.get('/experiences/{slug}')` with a slug that exists in the `experiences` table, THE API_Facade SHALL return a response object whose `data` field is the single experience record matching that slug.
3. IF the Frontend_Client calls `api.get('/experiences/{slug}')` with a slug that does not exist in the `experiences` table, THEN THE API_Facade SHALL throw an error whose response status is 404 so existing `notFound` detection in `ExperiencePage.jsx` continues to work without modification.
4. WHEN the Frontend_Client calls `api.get('/stories')`, THE API_Facade SHALL return a response object whose `data` field is an array of `travel_stories` records ordered by `created_at` descending.
5. WHEN the Frontend_Client calls `api.get('/stories/{slug}')` with a slug that exists in the `travel_stories` table, THE API_Facade SHALL return a response object whose `data` field is the single story record matching that slug.
6. IF the Frontend_Client calls `api.get('/stories/{slug}')` with a slug that does not exist in the `travel_stories` table, THEN THE API_Facade SHALL throw an error whose response status is 404 so existing `notFound` detection in `StoryPage.jsx` continues to work without modification.

### Requirement 3: Lead Submission Parity Under RLS

**User Story:** As a prospective client, I want to submit a travel inquiry from the public site, so that the agency receives my lead.

#### Acceptance Criteria

1. WHEN the Frontend_Client calls `api.post('/leads', payload)` with a valid payload from an Anon_Session, THE API_Facade SHALL insert one new row into the `leads_inquiries` table of the Supabase_Database.
2. THE Supabase_Database SHALL define an RLS policy named `public_insert_leads` that permits `INSERT` on `leads_inquiries` for the `anon` and `authenticated` roles with no additional `WITH CHECK` restriction beyond `true`.
3. IF an Anon_Session attempts a `SELECT`, `UPDATE`, or `DELETE` on the `leads_inquiries` table, THEN THE Supabase_Database SHALL deny the request via RLS, returning zero rows or a permission-denied error.
4. WHEN the API_Facade inserts a lead and the payload omits the `status` column, THE Supabase_Database SHALL apply the column default value `'new'` for that row.
5. THE API_Facade SHALL coerce empty-string fields in the lead payload to SQL NULL before insertion, preserving the behavior of the legacy `empty_to_none` validator in `backend/server.py`.

### Requirement 4: Admin Endpoint Parity Gated By RLS

**User Story:** As an admin, I want to read and update leads through the dashboard, so that I can manage inquiries with the same workflow as before.

#### Acceptance Criteria

1. THE Supabase_Database SHALL define an RLS policy that permits `SELECT` on `leads_inquiries` only when a row exists in `admin_users` whose `user_id` equals `auth.uid()`.
2. THE Supabase_Database SHALL define an RLS policy that permits `UPDATE` on `leads_inquiries` only when a row exists in `admin_users` whose `user_id` equals `auth.uid()`.
3. THE Supabase_Database SHALL retain the existing `public_read_experiences` policy, so that admin reads of `experiences` succeed under any authenticated session without requiring an additional admin-specific policy.
4. WHEN the Frontend_Client calls `api.get('/admin/leads')` from an Admin_Session, THE API_Facade SHALL return a response object whose `data` field is an array of all `leads_inquiries` rows ordered by `created_at` descending.
5. WHEN the Frontend_Client calls `api.patch('/admin/leads/{id}', body)` from an Admin_Session with a body containing `status` and/or `admin_notes`, THE API_Facade SHALL update the matching row in `leads_inquiries` and return a response object whose `data` field is the updated row.
6. WHEN the Frontend_Client calls `api.get('/admin/experiences')` from an Admin_Session, THE API_Facade SHALL return a response object whose `data` field is an array of all `experiences` rows ordered by `sort_order` ascending.
7. IF an Anon_Session or any non-admin authenticated session attempts `api.get('/admin/leads')`, THEN THE Supabase_Database SHALL return zero rows or a permission-denied error, and THE API_Facade SHALL surface that as an error to the caller.
8. IF an Anon_Session or any non-admin authenticated session attempts `api.patch('/admin/leads/{id}', body)`, THEN THE Supabase_Database SHALL reject the update via RLS, and THE API_Facade SHALL surface that as an error to the caller.

### Requirement 5: Concierge Serverless Function With Supabase-Backed History

**User Story:** As a website visitor, I want the AI concierge to remember our conversation across messages, so that follow-up questions stay in context.

#### Acceptance Criteria

1. THE Repository SHALL contain a Vercel Node.js serverless function at `api/concierge.js`.
2. THE Concierge_Function SHALL read `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` exclusively from server-side Vercel environment variables.
3. WHEN the Concierge_Function receives an HTTP POST with body `{ "conversation_id": null, "message": <non-empty string> }`, THE Concierge_Function SHALL generate a new `conversation_id`, call OpenAI with the system prompt plus the user message, persist the user message and assistant reply into the `conversations` table of the Supabase_Database, and return `{ conversation_id, reply, messages }` with HTTP 200.
4. WHEN the Concierge_Function receives an HTTP POST with body `{ "conversation_id": <existing id>, "message": <non-empty string> }`, THE Concierge_Function SHALL load the prior `messages` for that `conversation_id` from the Supabase_Database, include them in the OpenAI prompt as prior turns, append the new user and assistant messages to the stored history, and return `{ conversation_id, reply, messages }` with HTTP 200.
5. THE Concierge_Function response body SHALL conform to the schema `{ conversation_id: string, reply: string, messages: Array<{ role: 'user' | 'assistant', content: string }> }`.
6. THE Supabase_Database SHALL contain a table named `conversations` with columns `id` (uuid primary key, default `gen_random_uuid()`), `conversation_id` (text, unique, not null), `messages` (jsonb, default `'[]'::jsonb`), `created_at` (timestamptz, default `now()`), and `updated_at` (timestamptz, default `now()`).
7. THE Supabase_Database SHALL deny all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations on the `conversations` table from the `anon` role; only the service role SHALL access this table.
8. IF the OpenAI API call inside the Concierge_Function fails or times out, THEN THE Concierge_Function SHALL return HTTP 502 with a JSON body `{ "error": <generic message> }` and SHALL NOT persist a partial conversation turn into the Supabase_Database.
9. IF the request body to the Concierge_Function is missing the `message` field or `message` is an empty string, THEN THE Concierge_Function SHALL return HTTP 400 with a JSON body `{ "error": <descriptive message> }` and SHALL NOT call OpenAI.
10. THE Concierge_Function SHALL apply the same system prompt and the same model parameters (`gpt-4o-mini`, temperature 0.8, max_tokens 400) as the legacy `backend/server.py` `/api/concierge` route.

### Requirement 6: API Facade Preservation

**User Story:** As a frontend developer, I want components to keep importing `{ api }` from `src/lib/api.js` with the same call signatures, so that no component or page file changes.

#### Acceptance Criteria

1. THE API_Facade SHALL continue to export a binding named `api` that exposes the methods `get`, `post`, and `patch` and supports the same call sites used by `ExperiencesIndex.jsx`, `ExperiencePage.jsx`, `StoriesIndex.jsx`, `StoryPage.jsx`, `TravelStories.jsx`, `SignatureExperiences.jsx`, `InquiryForm.jsx`, `AIConcierge.jsx`, and `AdminDashboard.jsx`.
2. WHEN any caller invokes `api.get('/experiences')`, `api.get('/experiences/{slug}')`, `api.get('/stories')`, `api.get('/stories/{slug}')`, `api.get('/admin/leads')`, `api.get('/admin/experiences')`, `api.post('/leads', body)`, or `api.patch('/admin/leads/{id}', body)`, THE API_Facade SHALL fulfill the call by issuing the corresponding query against the Supabase_Database via the Supabase_Client.
3. WHEN any caller invokes `api.post('/concierge', body)`, THE API_Facade SHALL fulfill the call by issuing an HTTP POST to the relative URL `/api/concierge` served by the Concierge_Function.
4. THE API_Facade SHALL resolve every `api.<method>` call with an object whose `data` field contains the result payload, matching the existing axios response shape used by callers.
5. IF a Supabase call returns an error or no row was found for a single-record query, THEN THE API_Facade SHALL throw an error whose `response.status` field is set (e.g. 404 when the row does not exist, 401 or 403 when RLS denies access), so that existing `try/catch` and `e.response?.status === 404` checks in `ExperiencePage.jsx` and `StoryPage.jsx` continue to work without modification.
6. THE Repository SHALL not modify any file under `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, or `frontend/public/` as part of this migration, with the sole exception of `frontend/src/components/SignatureExperiences.jsx` if and only if it contains a hard-coded reference to `/api/setup/seed` that must be removed because the setup endpoint no longer exists.

### Requirement 7: SQL Migration Replaces Setup Endpoints

**User Story:** As an operator, I want a single SQL migration to provision schema, RLS, and seed data, so that I do not need any runtime setup endpoint.

#### Acceptance Criteria

1. THE Repository SHALL contain a SQL migration file (for example `supabase/migrations/0001_vercel_migration.sql` or an extended `SUPABASE_SCHEMA.sql`) that, when executed in the Supabase SQL Editor, creates or updates the `experiences`, `travel_stories`, `leads_inquiries`, `admin_users`, and `conversations` tables with the column definitions specified in this document.
2. THE SQL_Migration SHALL define RLS policies named `public_read_experiences`, `public_read_stories`, `public_insert_leads`, an admin-select policy on `leads_inquiries`, an admin-update policy on `leads_inquiries`, and a deny-all-anon policy or absence-of-policy on `conversations`.
3. THE SQL_Migration SHALL idempotently insert the seed `experiences` rows defined in `_seed_experiences_payload()` and `_full_catalog_payload()` of `backend/server.py`, using `slug` as the conflict key, so that running the migration twice produces no duplicate rows.
4. THE SQL_Migration SHALL idempotently insert the seed `travel_stories` rows defined in `_seed_stories_payload()` and `_extra_stories_payload()` of `backend/server.py`, using `slug` as the conflict key.
5. WHEN the SQL_Migration is executed twice in succession against the same Supabase_Database, THE Supabase_Database SHALL contain the same set of seed rows after the second run as after the first run.
6. THE Repository SHALL not contain any runtime endpoint or serverless function under `/api/setup/*` after the migration is in place.

### Requirement 8: UI And Functional Non-Regression

**User Story:** As a product owner, I want the visible site and the admin dashboard to behave identically to the pre-migration build, so that no user notices the migration.

#### Acceptance Criteria

1. THE Frontend_Client rendered DOM for the routes `/`, `/experiences`, `/experiences/:slug`, `/stories`, `/stories/:slug`, `/about`, `/contact`, `/admin/login`, and `/admin` SHALL be identical to the pre-migration build when given the same Supabase data, where identity is verified by a DOM snapshot diff that ignores only nondeterministic attributes (timestamps, generated React keys).
2. THE Repository SHALL not modify any file under `frontend/src/components/` (except as permitted by Requirement 6.6), `frontend/src/pages/`, `frontend/src/App.js`, `frontend/src/index.js`, `frontend/src/index.css`, `frontend/tailwind.config.js`, or `frontend/public/`.
3. WHEN a user submits the `InquiryForm` with valid data on a Vercel-deployed build, THE Frontend_Client SHALL transition to the same success state, with the same copy and the same elements, as the pre-migration build did when the legacy backend returned a 201.
4. WHEN a user opens the AI concierge panel and sends two messages in sequence, THE Frontend_Client SHALL render both assistant replies in the message list in the order they were generated, AND the second OpenAI request issued by the Concierge_Function SHALL include the first user message and first assistant reply as prior turns in its prompt.
5. WHEN an admin signs in via `/admin/login` and lands on `/admin`, THE Frontend_Client SHALL display the same leads list and experiences list elements as the pre-migration build, sourced from the new Supabase-backed `API_Facade`.
6. WHEN an admin updates a lead status from the dashboard via `api.patch('/admin/leads/{id}', { status })`, THE Frontend_Client SHALL replace the matching row in its in-memory list with the response data without performing a full page reload.

### Requirement 9: Environment Variable Contract

**User Story:** As a deployer, I want the existing environment variable names preserved, so that no external configuration breaks during the migration.

#### Acceptance Criteria

1. THE Frontend_Client SHALL continue to read `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` from build-time environment variables to construct the Supabase_Client.
2. WHERE `REACT_APP_BACKEND_URL` is unset or set to an empty string, THE API_Facade SHALL still resolve `/api/concierge` calls against the same origin as the SPA (relative URL).
3. THE Concierge_Function SHALL read `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` from server-side environment variables only, and SHALL NOT include any of these values in any HTTP response body, log line, or client bundle.
4. THE Repository SHALL document the required Vercel project environment variables in a README or migration notes file, listing exactly: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. IF `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` is undefined when the Concierge_Function is invoked, THEN THE Concierge_Function SHALL return HTTP 500 with a JSON body `{ "error": <generic message> }` and SHALL NOT include the variable name or any secret value in the response or in any log line.

### Requirement 10: Rollback Safety

**User Story:** As a deployer, I want to roll back the migration without data loss, so that an aborted deploy does not corrupt production.

#### Acceptance Criteria

1. THE SQL_Migration SHALL be additive on existing tables: it SHALL only add new tables (`conversations`), new columns (none expected), and new or replaced policies, and SHALL NOT execute `DROP TABLE` against `experiences`, `travel_stories`, `leads_inquiries`, or `admin_users`.
2. WHEN the Vercel_Deployment is reverted to a pre-migration commit, THE Supabase_Database SHALL retain all rows in the `conversations` table that were created during the migrated period.
3. THE Repository SHALL retain `backend/server.py`, `backend/requirements.txt`, and `backend/tests/` in version control history, so that rolling forward to the previous FastAPI deploy from a prior commit remains possible.
4. WHERE the operator sets `REACT_APP_BACKEND_URL` to a previous backend origin in Vercel, THE API_Facade SHALL not break: either the variable is ignored (because the facade now talks to Supabase directly) or the previous behavior is restored without code changes beyond the value of that environment variable.
