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
- `GET /api/experiences` — list ordered by sort_order
- `GET /api/experiences/{slug}` — single experience with chapters/gallery/amenities
- `GET /api/stories` — list travel stories
- `POST /api/leads` — public inquiry create (with empty-string→None Pydantic validator)
- `POST /api/concierge` — OpenAI gpt-4o-mini multi-turn chat (history stored in MongoDB)
- `GET /api/admin/leads` — admin only (Supabase JWT)
- `PATCH /api/admin/leads/{id}` — update status / admin_notes
- `GET /api/admin/experiences` — admin only
- `GET /api/setup/check` — schema/seed status
- `POST /api/setup/seed` — idempotent seed of admin user + 3 experiences + 3 stories

### Frontend
- Homepage with editorial Hero (uses `/4k_forest.mp4`), Signature Experiences, Testimonials, Travel Stories, Inquiry section
- Three seeded experience pages with cinematic chapters and atmosphere theming:
  - `/experiences/wake-above-the-clouds` (mountain — Mashobra)
  - `/experiences/ocean-beyond-the-horizon` (beach — Maldives)
  - `/experiences/where-time-keeps-court` (heritage — Udaipur)
- Multi-step Inquiry form (4 steps) with empty-string normalisation
- Floating AI Concierge chat panel
- WhatsApp floating CTA
- Admin login (`/admin/login`) + Admin Dashboard (`/admin`) — lead triage with status pills + detail panel

### Supabase
- 4 tables created: experiences, travel_stories, leads_inquiries, admin_users
- RLS policies: public read on experiences/stories, public insert on leads, authenticated read on own admin row
- 3 experiences + 3 stories + 1 admin user seeded

### Testing
- Iteration 1 + 2 passed (15/15 backend pytest, 100% frontend flows)

---

## Prioritized Backlog

### P0 (Next iteration if user requests)
- (none — MVP is complete & tested)

### P1
- Build out remaining 17 experience pages (the 3 are demonstrative)
- "Travel Stories" detail page (currently cards only on home)
- Admin: CRUD for experiences + stories (currently read-only)
- Image upload via Supabase Storage from admin

### P2
- Email notifications on new lead (SendGrid/Resend)
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
- 2026-06-08 — User pasted SUPABASE_SCHEMA.sql into SQL Editor manually (no PAT for management API)
- 2026-06-08 — Hero video: `/4k_forest.mp4` already present in /app, moved to `/frontend/public/`
