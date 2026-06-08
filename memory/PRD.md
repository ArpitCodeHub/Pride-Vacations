# Pride Vacations — Product Requirements Document

## Original Problem Statement
Build a **luxury travel experience platform** ("Pride Vacations") — a cinematic storytelling platform / premium travel magazine, NOT a hotel marketplace. The agency works with ~15–20 boutique properties. Goal: emotional connection first, direct lead generation second. Brand the agency, not the hotels.

## User Personas
- **The Romantic Escaper** (couples, honeymooners) — wants story-led, atmospheric escapes
- **The Aspirational Traveller** — discovering Pride Vacations via Instagram/Google, expects a magazine-grade brand experience
- **The Agency Operator** — needs an admin dashboard to read briefs, update status, and triage inquiries

## Tech Stack
- **Frontend**: React 18 (CRA) + Tailwind + Framer Motion + lucide-react + Supabase JS
- **Backend**: FastAPI + supabase-py + OpenAI (gpt-4o-mini) + MongoDB (for concierge chat history)
- **Database**: Supabase Postgres (experiences, travel_stories, leads_inquiries, admin_users) + MongoDB (conversations)
- **Auth**: Supabase Auth (email/password) for admin
- **AI**: OpenAI GPT-4o-mini via personal API key

## Core Requirements
1. Cinematic Homepage with full-screen hero video, signature experiences, stories, testimonials, inquiry form
2. Per-experience cinematic page following 6-chapter narrative (Dream → Arrival → Stay → Experiences → Details → Plan Journey)
3. Per-experience atmosphere theming (mountain / beach / heritage / forest)
4. Multi-step Plan-Your-Journey inquiry form storing leads in Supabase
5. AI Concierge floating chat (luxury travel curator voice, multi-turn memory)
6. WhatsApp floating CTA
7. Admin Dashboard for lead triage (login, list, detail, status update)
8. Editorial design language: Cormorant Garamond display serif + Outfit sans, cream/ink palette with gold accent, generous whitespace, grain textures, parallax & scroll reveals

---

## What's Been Implemented (MVP — June 2026)

### Backend (/app/backend/server.py)
- `GET /api/experiences` — list ordered by sort_order (12 experiences)
- `GET /api/experiences/{slug}` — single experience with chapters/gallery/amenities
- `GET /api/stories` — list travel stories (5 stories)
- `GET /api/stories/{slug}` — single story with body content
- `POST /api/leads` — public inquiry create (empty-string → None Pydantic validator)
- `POST /api/concierge` — OpenAI gpt-4o-mini multi-turn chat (history stored in MongoDB)
- `GET /api/admin/leads` — admin only (Supabase JWT)
- `PATCH /api/admin/leads/{id}` — update status / admin_notes
- `GET /api/admin/experiences` — admin only
- `GET /api/setup/check` — schema/seed status
- `POST /api/setup/seed` — idempotent initial admin + 3 experiences + 3 stories
- `POST /api/setup/seed_catalog` — idempotent upsert of full 12-experience catalog + 2 additional stories

### Frontend pages
- `/` Home — editorial Hero (uses `/4k_forest.mp4` with smooth fade-in, no poster flash), BrandStrip, Signature Experiences (top 3), Testimonials, Travel Stories (top 3 with link to journal), Inquiry section
- `/experiences` Atlas index — sticky atmosphere filter, all 12 escapes as editorial cards
- `/experiences/:slug` Cinematic chapter page with per-experience atmosphere theming (mountain / beach / heritage / forest)
- `/stories` Journal index — featured story + 3-up grid
- `/stories/:slug` Editorial reading layout with body, byline, return link, 404 fallback
- `/about` Brand page — 4 pillars, 3 team members, contact CTA
- `/contact` — Contact rows (WhatsApp / Email / Studio / Hours) + multi-step inquiry form
- `/admin/login` + `/admin` — Supabase Auth + lead triage dashboard

### Navigation
- Navbar with NavLink (active state in gold), mobile hamburger menu with slide-down sheet
- Footer with full sitemap: Wander · Reach us · Studio (incl. admin)
- ScrollToTop on every route change; honors in-page anchors

### Supabase
- 4 tables created: experiences, travel_stories, leads_inquiries, admin_users
- RLS policies: public read on experiences/stories, public insert on leads, authenticated read on own admin row
- 12 experiences (3 atmospheres × multiple per atmosphere) + 5 stories + 1 admin user seeded
- All 100+ media URLs verified to return HTTP 200

### Testing
- Iteration 1, 2, 3 passed (backend 18/18 pytest, ~92→100% frontend flows after image fix)

---

## Prioritized Backlog

### P1
- Add 8 more experiences to reach the spec's 20 (catalog is currently 12)
- Travel Stories: add real long-form body content (current bodies are excerpts)
- Admin: CRUD for experiences + stories (currently read-only)
- Image upload via Supabase Storage from admin (so user can swap placeholders without editing code)

### P2
- Email notifications on new lead (SendGrid/Resend) — deferred by user
- Saved/favorite experiences (auth-gated)
- Newsletter subscription
- Per-experience "Atmosphere Soundtrack" (ambient audio)
- Instagram embeds / press logo carousel
- Custom cursor, Lenis smooth scroll

### P3
- AI Concierge function calls (book a slot, lookup experiences)
- A/B testing on hero
- Lighthouse perf pass to hit 90+ on mobile
- Analytics (Plausible / GA4)

---

## Decisions Log
- 2026-06-08 — User chose React + Supabase (not Next.js) + personal OpenAI key (gpt-4o-mini)
- 2026-06-08 — User confirmed Pexels/Unsplash placeholder media until they provide owned assets
- 2026-06-08 — Skipped email notifications for MVP
- 2026-06-08 — User pasted SUPABASE_SCHEMA.sql into SQL Editor manually
- 2026-06-08 — Hero video: user uploaded their own `4k_forest.mp4` (51MB) via Emergent artifacts
- 2026-06-08 — Hero polish: removed poster image, used opacity fade-in only after `canplaythrough`
- 2026-06-08 — Scroll bug: added `ScrollToTop` + disabled `scrollRestoration`; respects hash anchors
- 2026-06-08 — Removed hero overline; moved "Curated luxury escapes · Est. 2018" to a BrandStrip below the hero
- 2026-06-08 — Built out full site: Experiences index, Stories index + detail, About, Contact, mobile nav
- 2026-06-08 — Swapped 10 broken Unsplash photo IDs to Pexels equivalents (CDN reliability)
