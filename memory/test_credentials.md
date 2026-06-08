# Pride Vacations — Test Credentials

## Supabase Admin Account
- **Email**: `team@zenuratech.online`
- **Password**: `pridevacationsWTF`
- **Auth method**: Supabase Auth (email/password)
- **Login URL**: `/admin/login` → redirects to `/admin`

## Supabase Project
- **URL**: https://grjnctnvbrjlglvvotbm.supabase.co
- **Project Ref**: grjnctnvbrjlglvvotbm

## Backend
- **Base URL**: `${REACT_APP_BACKEND_URL}/api`
- **Public endpoints** (no auth):
  - `GET /api/experiences` - list all
  - `GET /api/experiences/{slug}` - detail
  - `GET /api/stories` - list stories
  - `POST /api/leads` - create inquiry
  - `POST /api/concierge` - AI chat (gpt-4o-mini)
  - `GET /api/setup/check` - check schema status
  - `POST /api/setup/seed` - idempotent seeding
- **Admin endpoints** (require Supabase JWT Bearer token):
  - `GET /api/admin/leads`
  - `PATCH /api/admin/leads/{id}` body: `{status, admin_notes}`
  - `GET /api/admin/experiences`

## Seeded experience slugs
- `wake-above-the-clouds` (mountain)
- `ocean-beyond-the-horizon` (beach)
- `where-time-keeps-court` (heritage)
