-- ============================================================
-- PRIDE VACATIONS — Vercel Migration (0001)
-- Idempotent: safe to run multiple times. Re-running produces
-- zero new rows in experiences/travel_stories and no policy errors.
--
-- Replaces the legacy /api/setup/* runtime endpoints. Run this once
-- in Supabase Dashboard → SQL Editor → New Query → Run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================
-- TABLES (additive: create-if-not-exists)
-- ============================

create table if not exists public.experiences (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    subtitle text,
    hero_tagline text,
    atmosphere text not null default 'mountain',
    location_name text,
    country text,
    region text,
    hero_image_url text,
    hero_video_url text,
    gallery jsonb default '[]'::jsonb,
    amenities jsonb default '[]'::jsonb,
    duration_nights integer,
    starting_price numeric(12,2),
    currency_code text default 'INR',
    themes text[],
    story_overview text,
    story_chapters jsonb default '[]'::jsonb,
    property_name text,
    is_featured boolean default false,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.travel_stories (
    id uuid primary key default gen_random_uuid(),
    experience_id uuid references public.experiences(id) on delete set null,
    slug text not null unique,
    title text not null,
    excerpt text,
    hero_image_url text,
    body text,
    author_name text,
    read_minutes integer default 5,
    created_at timestamptz default now()
);

create table if not exists public.leads_inquiries (
    id uuid primary key default gen_random_uuid(),
    experience_id uuid references public.experiences(id) on delete set null,
    full_name text not null,
    email text not null,
    phone text,
    travel_companions text,
    preferred_destinations text[],
    budget_range text,
    preferred_travel_start date,
    preferred_travel_end date,
    occasion text,
    message text,
    status text default 'new',
    admin_notes text,
    created_at timestamptz default now()
);

create table if not exists public.admin_users (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique,
    email text not null unique,
    is_superadmin boolean default true,
    created_at timestamptz default now()
);

-- New table introduced by this migration: AI concierge conversation history.
-- Replaces the legacy MongoDB conversations collection.
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    conversation_id text not null unique,
    messages jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================
-- ROW LEVEL SECURITY
-- ============================
alter table public.experiences enable row level security;
alter table public.travel_stories enable row level security;
alter table public.leads_inquiries enable row level security;
alter table public.admin_users enable row level security;
alter table public.conversations enable row level security;

-- Drop existing policies (idempotent re-run) before recreating.
drop policy if exists "public_read_experiences" on public.experiences;
drop policy if exists "public_read_stories" on public.travel_stories;
drop policy if exists "public_insert_leads" on public.leads_inquiries;
drop policy if exists "admin_select_leads" on public.leads_inquiries;
drop policy if exists "admin_update_leads" on public.leads_inquiries;
drop policy if exists "admin_read_admins" on public.admin_users;

-- Public reads of experiences and travel_stories.
create policy "public_read_experiences"
on public.experiences for select
to anon, authenticated
using ( true );

create policy "public_read_stories"
on public.travel_stories for select
to anon, authenticated
using ( true );

-- Anyone may submit a lead (insert only).
create policy "public_insert_leads"
on public.leads_inquiries for insert
to anon, authenticated
with check ( true );

-- Admin-only read and update on leads (replaces the legacy verify_admin_token middleware).
create policy "admin_select_leads"
on public.leads_inquiries for select
to authenticated
using ( exists (select 1 from public.admin_users a where a.user_id = auth.uid()) );

create policy "admin_update_leads"
on public.leads_inquiries for update
to authenticated
using ( exists (select 1 from public.admin_users a where a.user_id = auth.uid()) );

-- Admins can read their own row.
create policy "admin_read_admins"
on public.admin_users for select
to authenticated
using ( user_id = auth.uid() );

-- conversations: NO POLICIES. RLS enabled + zero policies = anon and
-- authenticated are denied by default. Only the service role
-- (used by api/concierge.js) bypasses RLS. This is intentional.

-- ============================
-- SEED: experiences (idempotent upsert by slug)
-- ============================

-- 1. wake-above-the-clouds
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'wake-above-the-clouds',
    $$Wake Above The Clouds$$,
    $$A Himalayan retreat where mornings begin in mist$$,
    $$The mountains do not need to speak. You will hear them anyway.$$,
    'mountain', 'Mashobra', 'India', 'Himachal Pradesh',
    'https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    '/4k_forest.mp4',
    $$["https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/11584861/pexels-photo-11584861.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Cedar-warm spa with Himalayan salt rituals","Glass-walled suites facing the Shivalik range","Private dining at 7,500 ft","Guided forest walks at sunrise","Heated infinity pool"]$$::jsonb,
    4, 145000, 'INR',
    ARRAY['mountain','wellness','romance']::text[],
    $$An immersion into the breath of the Himalayas — slow mornings, pine-scented evenings, and a silence that rewrites time.$$,
    $$[
      {"number":"01","title":"The Dream","body":"Before the road climbs, you forget what hurried felt like. The mist begins to gather. Somewhere ahead, a wood-fired hearth is waiting for you.","image_url":"https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Arrival","body":"The last switchback reveals cedars folded in cloud. A woven shawl, ginger tea on a copper tray, and the hush of altitude. You exhale fully — perhaps for the first time this year.","image_url":"https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Stay","body":"Floor-to-ceiling glass borrows the mountains as art. Heated stone underfoot. A bath drawn with juniper as twilight turns the peaks to rose-gold.","image_url":"https://images.pexels.com/photos/11584861/pexels-photo-11584861.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"04","title":"The Experiences","body":"Sunrise treks through deodar forests. Tibetan singing-bowl meditations. A private dinner on a moonlit terrace where the chef cooks river trout over apple wood.","image_url":"https://images.unsplash.com/photo-1663530761401-15eefb544889?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"05","title":"The Details","body":"Wildflower Retreat — 85 suites perched above Mashobra, a 90-minute drive from Shimla. Helicopter transfers available on request.","image_url":"https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Wildflower Retreat$$, true, 1
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 2. ocean-beyond-the-horizon
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'ocean-beyond-the-horizon',
    $$Ocean Beyond The Horizon$$,
    $$Overwater villas where days dissolve into turquoise$$,
    $$Some shorelines are not destinations. They are decisions.$$,
    'beach', 'Baa Atoll', 'Maldives', 'Indian Ocean',
    'https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    null,
    $$["https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/9146381/pexels-photo-9146381.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Private overwater villa with infinity edge","House-reef snorkeling at your doorstep","Sunset dhoni cruises","Floating breakfasts","Open-air spa pavilion"]$$::jsonb,
    5, 425000, 'INR',
    ARRAY['beach','romance','wellness']::text[],
    $$An archipelago in slow motion — water that holds you, silence that lifts you, a sky that forgets to end.$$,
    $$[
      {"number":"01","title":"The Dream","body":"A seaplane lowers through cloud. Below: a string of green commas on a sheet of blue glass. Your destination is one of them.","image_url":"https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Arrival","body":"Bare feet on warm timber. A chilled coconut. The ocean lapping below your bedroom — a sound you will dream about for years.","image_url":"https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Stay","body":"A villa suspended above a private reef. A glass floor in your living room. A plunge pool that opens onto the lagoon. Sunsets that arrive in three colours.","image_url":"https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"04","title":"The Experiences","body":"Manta-ray snorkels at dawn. A floating breakfast of tropical fruit. An over-water spa where the therapist's voice competes with the tide — and loses.","image_url":"https://images.pexels.com/photos/9146381/pexels-photo-9146381.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"05","title":"The Details","body":"Velaa Private Reserve — Baa Atoll. 47 villas. Reachable by 45-minute seaplane from Malé.","image_url":"https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Velaa Private Reserve$$, true, 2
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 3. where-time-keeps-court
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'where-time-keeps-court',
    $$Where Time Keeps Court$$,
    $$A heritage palace turned private sanctuary$$,
    $$You will not be a guest here. You will be addressed as nobility.$$,
    'heritage', 'Udaipur', 'India', 'Rajasthan',
    'https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    null,
    $$["https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/14853538/pexels-photo-14853538.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Palace suites with hand-painted frescoes","Royal butler service","Private boat transfers across Lake Pichola","Mewar-style banquets in marble pavilions","Heritage walking tours by historians"]$$::jsonb,
    3, 215000, 'INR',
    ARRAY['heritage','culture','romance']::text[],
    $$An island palace afloat on Lake Pichola — where every threshold remembers a coronation and every meal is served with ceremony.$$,
    $$[
      {"number":"01","title":"The Dream","body":"Cross a lake at dusk. The palace ahead is the colour of moonlight on river-pearl. A boatman in white guides you toward a door that has welcomed kings.","image_url":"https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Arrival","body":"Marigold petals on still water. A welcome of rosewater and silver. You step from boat to colonnade as a chorus of folk musicians lifts the evening.","image_url":"https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Stay","body":"A suite once reserved for a queen. Hand-painted miniatures. A bathtub of beaten silver. Outside your window, the City Palace burns gold at sunset.","image_url":"https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"04","title":"The Experiences","body":"A private dawn aarti at Jagdish Temple. Vintage car ride through old Udaipur. A thali of 26 dishes served in the lily pond pavilion.","image_url":"https://images.pexels.com/photos/14853538/pexels-photo-14853538.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"05","title":"The Details","body":"Taj Lake Palace — Udaipur. 65 suites. Accessible only by private boat from Bansi Ghat.","image_url":"https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Taj Lake Palace$$, true, 3
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 4. the-forest-whispers
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'the-forest-whispers',
    $$The Forest Whispers$$,
    $$A coffee-plantation retreat in the Western Ghats$$,
    $$Listen carefully. The forest has been waiting for you.$$,
    'forest', 'Coorg', 'India', 'Karnataka',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    null,
    $$["https://images.pexels.com/photos/906982/pexels-photo-906982.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.unsplash.com/photo-1518495973542-4542c06a5843?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1502082553048-f009c37129b9?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Private pool villas in a working coffee estate","Plantation walks at dawn","Open-air spa pavilions","Coorgi-cuisine table d'hôte dinners","Birding with a resident naturalist"]$$::jsonb,
    4, 165000, 'INR',
    ARRAY['forest','wellness','nature']::text[],
    $$A rainforest at altitude — where coffee blooms perfume the air and the only schedule that matters is the one the cicadas keep.$$,
    $$[
      {"number":"01","title":"The Dream","body":"You step off a winding ghat road into a green that hums. Somewhere a stream is hurrying. You are not.","image_url":"https://images.pexels.com/photos/906982/pexels-photo-906982.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"02","title":"The Stay","body":"A villa carved into the hillside, screened by jackfruit and silver oak. Your private pool catches the canopy.","image_url":"https://images.unsplash.com/photo-1518495973542-4542c06a5843?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"A plantation walk with the man who knows every tree by name. An iyengar yoga session beside a waterfall. A pandhi curry that you will be looking for in restaurants for the rest of your life.","image_url":"https://images.unsplash.com/photo-1502082553048-f009c37129b9?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Evolve Back, Coorg$$, false, 4
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 5. between-two-deserts
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'between-two-deserts',
    $$Between Two Deserts$$,
    $$A golden fort city and the sands beyond it$$,
    $$Some places do not photograph. They have to be remembered.$$,
    'heritage', 'Jaisalmer', 'India', 'Rajasthan',
    'https://images.unsplash.com/photo-1477587458883-47145ed94245?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    null,
    $$["https://images.pexels.com/photos/6757895/pexels-photo-6757895.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.unsplash.com/photo-1564507592333-c60657eea523?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1477587458883-47145ed94245?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Sandstone suites with private courtyards","A dawn camel ride into the Thar","Folk musicians performing under the stars","A private banquet on a sand dune","Heritage walks inside Jaisalmer fort"]$$::jsonb,
    3, 185000, 'INR',
    ARRAY['heritage','desert','culture']::text[],
    $$Where the city is the same gold as the desert, and the line between them is a story you are about to walk into.$$,
    $$[
      {"number":"01","title":"The Dream","body":"Imagine a city built from honeyed sandstone, lit so completely by the sun that it appears to be on fire.","image_url":"https://images.pexels.com/photos/6757895/pexels-photo-6757895.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"02","title":"The Stay","body":"A modern fort in the spirit of the old one — vast courtyards, deep verandas, and a pool the colour of old turquoise.","image_url":"https://images.unsplash.com/photo-1564507592333-c60657eea523?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"An evening in the dunes — camels, fireside Manganiyar music, a table set with copper and silver. The desert is the most generous host you will ever have.","image_url":"https://images.unsplash.com/photo-1477587458883-47145ed94245?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Suryagarh$$, false, 5
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 6. salt-on-the-skin
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'salt-on-the-skin',
    $$Salt On The Skin$$,
    $$A Portuguese-Goan villa above the Arabian Sea$$,
    $$Late lunches. Long walks. A house that exhales.$$,
    'beach', 'South Goa', 'India', 'Goa',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    null,
    $$["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Suites in a restored 18th-century manor","A long, sea-view pool","Lazy bicycles, hidden chapels","Slow lunches of beach catch & feni","Sunset cruises to dolphin coves"]$$::jsonb,
    4, 95000, 'INR',
    ARRAY['beach','heritage','slow-travel']::text[],
    $$A house with white linen curtains that lift when the sea breathes. A village whose church bells tell time better than your phone.$$,
    $$[
      {"number":"01","title":"The Dream","body":"Imagine an old Portuguese house on a hillside above the sea, where the floors are red oxide and the doors are taller than necessary.","image_url":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Stay","body":"Suites with high ceilings, four-poster beds and a balcony you will never quite leave. The cook will ask what you feel like eating today.","image_url":"https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"A morning at a quiet beach where the sand is the colour of cinnamon. A long lunch of clams and rice. A nap. A village walk at dusk. Repeat.","image_url":"https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$The Postcard, Cuelim$$, false, 6
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 7. monsoon-and-memory
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'monsoon-and-memory',
    $$Monsoon And Memory$$,
    $$A tea-country estate written in rain$$,
    $$Some travel changes you. This one quiets you.$$,
    'forest', 'Munnar', 'India', 'Kerala',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    null,
    $$["https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.pexels.com/photos/2476154/pexels-photo-2476154.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Cottages built around tea slopes","A reading room with old novels","Estate breakfasts on a covered veranda","Tea factory visits & cuppings","Spice-trail walks"]$$::jsonb,
    4, 115000, 'INR',
    ARRAY['forest','tea','monsoon']::text[],
    $$A planter's bungalow surrounded by terraces of tea — written into mist, written into rain.$$,
    $$[
      {"number":"01","title":"The Dream","body":"The bus from Cochin climbs. The light turns silver. The tea-rows begin to fold themselves into the hills like sentences into a paragraph.","image_url":"https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"02","title":"The Stay","body":"A cottage with a fireplace, woven blankets, and a window that lets the monsoon do most of the talking.","image_url":"https://images.pexels.com/photos/2476154/pexels-photo-2476154.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"03","title":"The Experiences","body":"A walk with the estate manager. A tea-tasting that ruins all other tea for you. A long afternoon doing absolutely nothing.","image_url":"https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Windermere Estate$$, false, 7
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 8. snow-and-sandalwood
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'snow-and-sandalwood',
    $$Snow And Sandalwood$$,
    $$An apple-orchard retreat in the upper Himalayas$$,
    $$Bring nothing but a kind heart and a thick coat.$$,
    'mountain', 'Naldehra', 'India', 'Himachal Pradesh',
    'https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    null,
    $$["https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1551632811-561732d1e306?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Wooden chalets with woodburning stoves","An apple orchard you can walk through","A glass-fronted reading lounge","Mountain-style breakfasts","Bonfires under a winter sky"]$$::jsonb,
    4, 135000, 'INR',
    ARRAY['mountain','winter','romance']::text[],
    $$A pocket of stillness where the cedars are taller than the houses, and the houses are warmer than the cities.$$,
    $$[
      {"number":"01","title":"The Dream","body":"Imagine arriving somewhere where the only sound is the snow making up its mind whether or not to fall.","image_url":"https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Stay","body":"A chalet built of cedar and stone. A four-poster covered in a quilt your grandmother would have approved of.","image_url":"https://images.unsplash.com/photo-1551632811-561732d1e306?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"A snow walk to a temple. A bonfire with kahwa. A dinner of rajma and rice you remember for years.","image_url":"https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Chalets Naldehra$$, false, 8
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 9. the-river-remembers-you
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'the-river-remembers-you',
    $$The River Remembers You$$,
    $$A wellness ashram above the Ganges$$,
    $$You did not come here to be different. You came here to remember.$$,
    'forest', 'Rishikesh', 'India', 'Uttarakhand',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    null,
    $$["https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.unsplash.com/photo-1517457373958-b7bdd4587205?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"]$$::jsonb,
    $$["Daily ayurveda consultations","Heritage palace block of suites","Hatha & vinyasa yoga at sunrise","Ganga aarti by private boat","Sattvic plant-led tasting menus"]$$::jsonb,
    7, 285000, 'INR',
    ARRAY['wellness','spiritual','river']::text[],
    $$An ashram-spa above the river — where each day begins with breath and ends with silence.$$,
    $$[
      {"number":"01","title":"The Dream","body":"You arrive carrying things you did not pack. Stress. Speed. A version of you that is going to be set down here.","image_url":"https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"02","title":"The Stay","body":"A suite in an old maharaja's palace, then a cottage in the forest. Your day begins when the bell rings — gently.","image_url":"https://images.unsplash.com/photo-1517457373958-b7bdd4587205?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"Daily abhyanga oil massages. An ayurvedic doctor who looks at you twice and seems to know things. The Ganga aarti — by boat.","image_url":"https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"}
    ]$$::jsonb,
    $$Ananda in the Himalayas$$, true, 9
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 10. an-island-without-clocks
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'an-island-without-clocks',
    $$An Island Without Clocks$$,
    $$A barefoot luxury hideaway in the Andamans$$,
    $$Forty-eight kinds of blue. None of them are the same.$$,
    'beach', 'Havelock Island', 'India', 'Andaman & Nicobar',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400',
    null,
    $$["https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.unsplash.com/photo-1559827260-dc66d52bef19?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Andamanese-style timber villas","Private plunge pools facing the bay","Reef snorkelling at first light","Slow seafood lunches","Sunset kayaking"]$$::jsonb,
    5, 195000, 'INR',
    ARRAY['beach','nature','adventure']::text[],
    $$Where the sand is so white it argues with the sky, and the days unspool like the tide.$$,
    $$[
      {"number":"01","title":"The Dream","body":"A two-hour ferry from Port Blair. The colour of the water gets impossible. You stop trying to describe it.","image_url":"https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Stay","body":"A timber villa under a tropical canopy. A private deck. A pool that mirrors the sky.","image_url":"https://images.unsplash.com/photo-1559827260-dc66d52bef19?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"Snorkel at Radhanagar. A bonfire at Elephant Beach. A sea-bass for dinner that arrived an hour ago.","image_url":"https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=2000"}
    ]$$::jsonb,
    $$Taj Exotica Andamans$$, false, 10
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 11. the-light-of-jodhpur
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'the-light-of-jodhpur',
    $$The Light Of Jodhpur$$,
    $$A heritage haveli inside the blue city$$,
    $$Some cities are buildings. This one is a colour.$$,
    'heritage', 'Jodhpur', 'India', 'Rajasthan',
    'https://images.pexels.com/photos/3155667/pexels-photo-3155667.jpeg?auto=compress&cs=tinysrgb&w=2000',
    null,
    $$["https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/13860893/pexels-photo-13860893.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.pexels.com/photos/3601455/pexels-photo-3601455.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Suites looking onto Mehrangarh fort","A red-sandstone pool at twilight","Private fort tour at dawn","Rooftop dinners at Baradari","Old-city bazaar walks with a historian"]$$::jsonb,
    3, 165000, 'INR',
    ARRAY['heritage','culture','city']::text[],
    $$A boutique haveli within a walled city — every window framed by a fort, every meal told as a story.$$,
    $$[
      {"number":"01","title":"The Dream","body":"The fort rises out of rock like an exhale. The city below it has decided to be blue, and you do not question it.","image_url":"https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"02","title":"The Stay","body":"A suite of red sandstone and white linen, with a window that frames the fort like a painting.","image_url":"https://images.pexels.com/photos/13860893/pexels-photo-13860893.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"03","title":"The Experiences","body":"Mehrangarh at dawn before the crowd. Lunch in an old courtyard. A rooftop dinner under three thousand stars.","image_url":"https://images.pexels.com/photos/3601455/pexels-photo-3601455.jpeg?auto=compress&cs=tinysrgb&w=2000"}
    ]$$::jsonb,
    $$RAAS Jodhpur$$, false, 11
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- 12. silence-in-the-sand
insert into public.experiences (
    slug, title, subtitle, hero_tagline, atmosphere, location_name, country, region,
    hero_image_url, hero_video_url, gallery, amenities, duration_nights, starting_price,
    currency_code, themes, story_overview, story_chapters, property_name, is_featured, sort_order
) values (
    'silence-in-the-sand',
    $$Silence In The Sand$$,
    $$A salt-desert sanctuary in the Rann of Kutch$$,
    $$When the world goes white, you hear yourself again.$$,
    'heritage', 'Bhuj', 'India', 'Gujarat',
    'https://images.pexels.com/photos/16041499/pexels-photo-16041499.jpeg?auto=compress&cs=tinysrgb&w=2000',
    null,
    $$["https://images.pexels.com/photos/2387418/pexels-photo-2387418.jpeg?auto=compress&cs=tinysrgb&w=2000","https://images.unsplash.com/photo-1546484959-f9a381d1330d?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000","https://images.pexels.com/photos/4577107/pexels-photo-4577107.jpeg?auto=compress&cs=tinysrgb&w=2000"]$$::jsonb,
    $$["Bhunga-style cottages with private patios","A full-moon walk on the white desert","Craft village visits — Banni, Hodka","Folk music by the bonfire","Birdwatching in the Little Rann"]$$::jsonb,
    3, 85000, 'INR',
    ARRAY['heritage','desert','craft']::text[],
    $$An expanse of salt that goes silver under the moon. A village of artisans nearby. A sky larger than you remembered.$$,
    $$[
      {"number":"01","title":"The Dream","body":"You drive across a road that begins to disagree with the idea of a road. The land becomes white. You are arriving somewhere.","image_url":"https://images.pexels.com/photos/2387418/pexels-photo-2387418.jpeg?auto=compress&cs=tinysrgb&w=2000"},
      {"number":"02","title":"The Stay","body":"A bhunga — a circular mud cottage with a roof painted by hand. Inside, it is cool and quiet.","image_url":"https://images.unsplash.com/photo-1546484959-f9a381d1330d?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"},
      {"number":"03","title":"The Experiences","body":"The white desert under a full moon. A morning with a Rabari weaver. A dinner of dal-pakwan that tastes like someone's grandmother made it.","image_url":"https://images.pexels.com/photos/4577107/pexels-photo-4577107.jpeg?auto=compress&cs=tinysrgb&w=2000"}
    ]$$::jsonb,
    $$Rann Riders$$, false, 12
)
on conflict (slug) do update set
    title = excluded.title, subtitle = excluded.subtitle, hero_tagline = excluded.hero_tagline,
    atmosphere = excluded.atmosphere, location_name = excluded.location_name, country = excluded.country, region = excluded.region,
    hero_image_url = excluded.hero_image_url, hero_video_url = excluded.hero_video_url,
    gallery = excluded.gallery, amenities = excluded.amenities,
    duration_nights = excluded.duration_nights, starting_price = excluded.starting_price, currency_code = excluded.currency_code,
    themes = excluded.themes, story_overview = excluded.story_overview, story_chapters = excluded.story_chapters,
    property_name = excluded.property_name, is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    updated_at = now();

-- ============================
-- SEED: travel_stories (idempotent upsert by slug)
-- ============================

-- 1. the-quiet-art-of-himalayan-mornings
insert into public.travel_stories (slug, title, excerpt, hero_image_url, body, author_name, read_minutes)
values (
    'the-quiet-art-of-himalayan-mornings',
    $$The Quiet Art of Himalayan Mornings$$,
    $$On waking up in a cedar forest, and what the mountains teach you about stillness.$$,
    'https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    $$There is a particular shade of light at 6:14 a.m. in Mashobra. It does not announce itself. It simply arrives — slipping between the deodar branches like a confidence shared between old friends...$$,
    $$Anika Roy$$, 6
)
on conflict (slug) do update set
    title = excluded.title, excerpt = excluded.excerpt, hero_image_url = excluded.hero_image_url,
    body = excluded.body, author_name = excluded.author_name, read_minutes = excluded.read_minutes;

-- 2. an-archipelago-of-second-chances
insert into public.travel_stories (slug, title, excerpt, hero_image_url, body, author_name, read_minutes)
values (
    'an-archipelago-of-second-chances',
    $$An Archipelago of Second Chances$$,
    $$Why the Maldives is less a destination, and more a recalibration.$$,
    'https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    $$I came to the Maldives with a list. I left with none. There is a particular quality to being out of cellular range while the world makes its decisions without you...$$,
    $$Devraj Mehta$$, 5
)
on conflict (slug) do update set
    title = excluded.title, excerpt = excluded.excerpt, hero_image_url = excluded.hero_image_url,
    body = excluded.body, author_name = excluded.author_name, read_minutes = excluded.read_minutes;

-- 3. the-palaces-still-listen
insert into public.travel_stories (slug, title, excerpt, hero_image_url, body, author_name, read_minutes)
values (
    'the-palaces-still-listen',
    $$The Palaces Still Listen$$,
    $$Three nights inside a floating Rajasthani palace, and what it remembers.$$,
    'https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    $$The thing about a palace built on a lake is that the marble holds sound differently. You begin to whisper without knowing why. You become an apprentice of restraint...$$,
    $$Imran Sayed$$, 7
)
on conflict (slug) do update set
    title = excluded.title, excerpt = excluded.excerpt, hero_image_url = excluded.hero_image_url,
    body = excluded.body, author_name = excluded.author_name, read_minutes = excluded.read_minutes;

-- 4. a-letter-to-anyone-who-hasnt-traveled-alone
insert into public.travel_stories (slug, title, excerpt, hero_image_url, body, author_name, read_minutes)
values (
    'a-letter-to-anyone-who-hasnt-traveled-alone',
    $$A Letter To Anyone Who Hasn't Traveled Alone$$,
    $$What a single suitcase, an unspoken language, and three slow weeks taught me.$$,
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    $$I want to tell you what nobody told me, before I went. That you will be afraid at the airport. That you will sit on the plane and wonder what on earth you were thinking. That you will land, and the air will smell new...$$,
    $$Aanya Verma$$, 8
)
on conflict (slug) do update set
    title = excluded.title, excerpt = excluded.excerpt, hero_image_url = excluded.hero_image_url,
    body = excluded.body, author_name = excluded.author_name, read_minutes = excluded.read_minutes;

-- 5. the-best-meal-i-ever-had-was-not-in-a-restaurant
insert into public.travel_stories (slug, title, excerpt, hero_image_url, body, author_name, read_minutes)
values (
    'the-best-meal-i-ever-had-was-not-in-a-restaurant',
    $$The Best Meal I Ever Had Was Not In A Restaurant$$,
    $$On a fishing boat off Havelock, with a chef who didn't know he was one.$$,
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000',
    $$He cooked it on a kerosene stove. He used three things. One was salt. I have eaten in many of the celebrated dining rooms of the world. None of them have come close...$$,
    $$Kabir Joshi$$, 5
)
on conflict (slug) do update set
    title = excluded.title, excerpt = excluded.excerpt, hero_image_url = excluded.hero_image_url,
    body = excluded.body, author_name = excluded.author_name, read_minutes = excluded.read_minutes;

-- ============================================================
-- END OF MIGRATION 0001
-- Verify after running:
--   select count(*) from public.experiences;     -- expect 12
--   select count(*) from public.travel_stories;  -- expect 5
--   select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;
-- Re-running this file is safe and produces zero new rows.
-- ============================================================
