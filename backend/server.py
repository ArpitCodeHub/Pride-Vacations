"""
Pride Vacations — FastAPI backend
Routes: /api/experiences, /api/stories, /api/leads, /api/concierge, /api/admin/*, /api/setup/*
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Literal
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client, Client
from openai import OpenAI

# ---------------------------------------------------------------- config
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pride")

# ---------------------------------------------------------------- clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client[DB_NAME]
conversations_col = mongo_db["conversations"]

# ---------------------------------------------------------------- app
app = FastAPI(title="Pride Vacations API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


# ---------------------------------------------------------------- auth
async def verify_admin_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Supabase token")
    user = resp.json()
    user_id = user.get("id")
    admin_row = (
        supabase.table("admin_users").select("id").eq("user_id", user_id).execute()
    )
    if not admin_row.data:
        raise HTTPException(status_code=403, detail="Not an admin")
    return user


# ---------------------------------------------------------------- models
class ExperienceOut(BaseModel):
    id: str
    slug: str
    title: str
    subtitle: Optional[str] = None
    hero_tagline: Optional[str] = None
    atmosphere: str = "mountain"
    location_name: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_video_url: Optional[str] = None
    gallery: list = []
    amenities: list = []
    duration_nights: Optional[int] = None
    starting_price: Optional[float] = None
    currency_code: Optional[str] = "INR"
    themes: Optional[List[str]] = []
    story_overview: Optional[str] = None
    story_chapters: list = []
    property_name: Optional[str] = None
    is_featured: bool = False
    sort_order: int = 0


class StoryOut(BaseModel):
    id: str
    slug: str
    title: str
    excerpt: Optional[str] = None
    hero_image_url: Optional[str] = None
    body: Optional[str] = None
    author_name: Optional[str] = None
    read_minutes: Optional[int] = 5


class LeadCreate(BaseModel):
    experience_id: Optional[str] = None
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    travel_companions: Optional[str] = None
    preferred_destinations: Optional[List[str]] = None
    budget_range: Optional[str] = None
    preferred_travel_start: Optional[str] = None
    preferred_travel_end: Optional[str] = None
    occasion: Optional[str] = None
    message: Optional[str] = None

    @field_validator(
        "experience_id",
        "phone",
        "travel_companions",
        "budget_range",
        "preferred_travel_start",
        "preferred_travel_end",
        "occasion",
        "message",
        mode="before",
    )
    @classmethod
    def empty_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class LeadOut(LeadCreate):
    id: str
    status: str
    created_at: str
    admin_notes: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    messages: List[ChatMessage]


# ---------------------------------------------------------------- public routes
@api.get("/")
def root():
    return {"app": "Pride Vacations", "status": "ok"}


@api.get("/experiences", response_model=List[ExperienceOut])
def list_experiences():
    resp = (
        supabase.table("experiences")
        .select("*")
        .order("sort_order")
        .execute()
    )
    return resp.data or []


@api.get("/experiences/{slug}", response_model=ExperienceOut)
def get_experience(slug: str):
    resp = supabase.table("experiences").select("*").eq("slug", slug).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Experience not found")
    return resp.data[0]


@api.get("/stories", response_model=List[StoryOut])
def list_stories():
    resp = (
        supabase.table("travel_stories")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@api.get("/stories/{slug}", response_model=StoryOut)
def get_story(slug: str):
    resp = supabase.table("travel_stories").select("*").eq("slug", slug).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Story not found")
    return resp.data[0]


@api.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate):
    record = payload.model_dump(exclude_none=True)
    resp = supabase.table("leads_inquiries").insert(record).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save inquiry")
    return resp.data[0]


# ---------------------------------------------------------------- AI Concierge
SYSTEM_PROMPT = """You are the Pride Vacations Concierge — a warm, refined luxury travel curator.
Pride Vacations is a boutique travel atelier crafting cinematic, deeply personal escapes across India and beyond — mountain retreats, beach sanctuaries, heritage palaces, jungle hideaways, and wellness journeys.

Voice: editorial, evocative, never salesy. Speak like a luxury magazine.
Style: short paragraphs, sensory language, suggest 2-3 thoughtful options.
Always end by offering to connect them to a human travel designer or to refine the brief.
Never invent specific prices or real-time availability. Politely decline non-travel questions and redirect.
Keep replies under 160 words."""


@api.post("/concierge", response_model=ChatResponse)
async def concierge(payload: ChatRequest):
    conv_id = payload.conversation_id or str(uuid4())
    existing = await conversations_col.find_one({"conversation_id": conv_id})
    history = existing.get("messages", []) if existing else []

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in history:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": payload.message})

    completion = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.8,
        max_tokens=400,
    )
    reply = completion.choices[0].message.content.strip()

    now = datetime.now(timezone.utc).isoformat()
    new_history = history + [
        {"role": "user", "content": payload.message, "ts": now},
        {"role": "assistant", "content": reply, "ts": now},
    ]
    await conversations_col.update_one(
        {"conversation_id": conv_id},
        {
            "$set": {
                "conversation_id": conv_id,
                "messages": new_history,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    visible = [ChatMessage(role=m["role"], content=m["content"]) for m in new_history]
    return ChatResponse(conversation_id=conv_id, reply=reply, messages=visible)


# ---------------------------------------------------------------- admin
@api.get("/admin/leads", response_model=List[LeadOut])
def admin_list_leads(_: dict = Depends(verify_admin_token)):
    resp = (
        supabase.table("leads_inquiries")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@api.patch("/admin/leads/{lead_id}", response_model=LeadOut)
def admin_update_lead(
    lead_id: str,
    payload: LeadStatusUpdate,
    _: dict = Depends(verify_admin_token),
):
    update = payload.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = (
        supabase.table("leads_inquiries")
        .update(update)
        .eq("id", lead_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return resp.data[0]


@api.get("/admin/experiences", response_model=List[ExperienceOut])
def admin_list_experiences(_: dict = Depends(verify_admin_token)):
    resp = supabase.table("experiences").select("*").order("sort_order").execute()
    return resp.data or []


# ---------------------------------------------------------------- setup / seeding
@api.get("/setup/check")
def setup_check():
    """Reports whether the Supabase schema and admin user are ready."""
    state = {"schema_ready": False, "admin_user": False, "experiences_seeded": False}
    try:
        exp_resp = supabase.table("experiences").select("id", count="exact").execute()
        state["schema_ready"] = True
        state["experiences_seeded"] = (exp_resp.count or 0) > 0
    except Exception as e:
        state["schema_error"] = str(e)
    try:
        admin_resp = (
            supabase.table("admin_users").select("id").eq("email", ADMIN_EMAIL).execute()
        )
        state["admin_user"] = bool(admin_resp.data)
    except Exception:
        pass
    return state


@api.post("/setup/seed")
def setup_seed():
    """Idempotently seeds admin user + sample experiences + travel stories.
    Requires the schema to be applied first via SUPABASE_SCHEMA.sql in the Supabase SQL Editor.
    """
    result = {"admin_created": False, "experiences_inserted": 0, "stories_inserted": 0}

    # 1. Admin user via Supabase Auth admin API
    try:
        existing_admin = (
            supabase.table("admin_users").select("user_id").eq("email", ADMIN_EMAIL).execute()
        )
        if not existing_admin.data:
            # Try create; if user already exists, fetch
            try:
                created = supabase.auth.admin.create_user(
                    {
                        "email": ADMIN_EMAIL,
                        "password": ADMIN_PASSWORD,
                        "email_confirm": True,
                    }
                )
                auth_user_id = created.user.id
            except Exception as e:
                # User may already exist — look it up
                logger.warning("create_user failed (%s); attempting to find user", e)
                listed = supabase.auth.admin.list_users()
                auth_user_id = None
                # supabase-py returns a list directly
                user_list = listed if isinstance(listed, list) else getattr(listed, "users", [])
                for u in user_list:
                    if (getattr(u, "email", None) or "").lower() == ADMIN_EMAIL.lower():
                        auth_user_id = u.id
                        break
                if not auth_user_id:
                    raise HTTPException(status_code=500, detail=f"Could not provision admin: {e}")
            supabase.table("admin_users").insert(
                {"user_id": auth_user_id, "email": ADMIN_EMAIL, "is_superadmin": True}
            ).execute()
            result["admin_created"] = True
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("admin seeding failed")
        raise HTTPException(status_code=500, detail=f"Admin seed failed: {e}")

    # 2. Experiences (only if empty)
    exp_count = supabase.table("experiences").select("id", count="exact").execute()
    if (exp_count.count or 0) == 0:
        experiences = _seed_experiences_payload()
        ins = supabase.table("experiences").insert(experiences).execute()
        result["experiences_inserted"] = len(ins.data or [])

    # 3. Stories
    st_count = supabase.table("travel_stories").select("id", count="exact").execute()
    if (st_count.count or 0) == 0:
        stories = _seed_stories_payload()
        ins = supabase.table("travel_stories").insert(stories).execute()
        result["stories_inserted"] = len(ins.data or [])

    return result


@api.post("/setup/seed_catalog")
def setup_seed_catalog():
    """Adds the remaining catalog (idempotent upsert by slug).
    Adds ~9 more experiences and 2 more travel stories on top of the initial seed."""
    catalog = _full_catalog_payload()
    extra_stories = _extra_stories_payload()
    exp_inserted = 0
    sto_inserted = 0
    for exp in catalog:
        existing = supabase.table("experiences").select("id").eq("slug", exp["slug"]).execute()
        if existing.data:
            supabase.table("experiences").update(exp).eq("slug", exp["slug"]).execute()
        else:
            supabase.table("experiences").insert(exp).execute()
            exp_inserted += 1
    for s in extra_stories:
        existing = supabase.table("travel_stories").select("id").eq("slug", s["slug"]).execute()
        if not existing.data:
            supabase.table("travel_stories").insert(s).execute()
            sto_inserted += 1
    return {"experiences_added": exp_inserted, "stories_added": sto_inserted}


def _seed_experiences_payload():
    return [
        {
            "slug": "wake-above-the-clouds",
            "title": "Wake Above The Clouds",
            "subtitle": "A Himalayan retreat where mornings begin in mist",
            "hero_tagline": "The mountains do not need to speak. You will hear them anyway.",
            "atmosphere": "mountain",
            "location_name": "Mashobra",
            "country": "India",
            "region": "Himachal Pradesh",
            "property_name": "Wildflower Retreat",
            "hero_image_url": "https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "hero_video_url": "/4k_forest.mp4",
            "gallery": [
                "https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.pexels.com/photos/11584861/pexels-photo-11584861.jpeg?auto=compress&cs=tinysrgb&w=2000",
            ],
            "amenities": [
                "Cedar-warm spa with Himalayan salt rituals",
                "Glass-walled suites facing the Shivalik range",
                "Private dining at 7,500 ft",
                "Guided forest walks at sunrise",
                "Heated infinity pool",
            ],
            "duration_nights": 4,
            "starting_price": 145000,
            "currency_code": "INR",
            "themes": ["mountain", "wellness", "romance"],
            "story_overview": "An immersion into the breath of the Himalayas — slow mornings, pine-scented evenings, and a silence that rewrites time.",
            "story_chapters": [
                {
                    "number": "01",
                    "title": "The Dream",
                    "body": "Before the road climbs, you forget what hurried felt like. The mist begins to gather. Somewhere ahead, a wood-fired hearth is waiting for you.",
                    "image_url": "https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "02",
                    "title": "The Arrival",
                    "body": "The last switchback reveals cedars folded in cloud. A woven shawl, ginger tea on a copper tray, and the hush of altitude. You exhale fully — perhaps for the first time this year.",
                    "image_url": "https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "03",
                    "title": "The Stay",
                    "body": "Floor-to-ceiling glass borrows the mountains as art. Heated stone underfoot. A bath drawn with juniper as twilight turns the peaks to rose-gold.",
                    "image_url": "https://images.pexels.com/photos/11584861/pexels-photo-11584861.jpeg?auto=compress&cs=tinysrgb&w=2000",
                },
                {
                    "number": "04",
                    "title": "The Experiences",
                    "body": "Sunrise treks through deodar forests. Tibetan singing-bowl meditations. A private dinner on a moonlit terrace where the chef cooks river trout over apple wood.",
                    "image_url": "https://images.unsplash.com/photo-1663530761401-15eefb544889?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "05",
                    "title": "The Details",
                    "body": "Wildflower Retreat — 85 suites perched above Mashobra, a 90-minute drive from Shimla. Helicopter transfers available on request.",
                    "image_url": "https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
            ],
            "is_featured": True,
            "sort_order": 1,
        },
        {
            "slug": "ocean-beyond-the-horizon",
            "title": "Ocean Beyond The Horizon",
            "subtitle": "Overwater villas where days dissolve into turquoise",
            "hero_tagline": "Some shorelines are not destinations. They are decisions.",
            "atmosphere": "beach",
            "location_name": "Baa Atoll",
            "country": "Maldives",
            "region": "Indian Ocean",
            "property_name": "Velaa Private Reserve",
            "hero_image_url": "https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.pexels.com/photos/9146381/pexels-photo-9146381.jpeg?auto=compress&cs=tinysrgb&w=2000",
            ],
            "amenities": [
                "Private overwater villa with infinity edge",
                "House-reef snorkeling at your doorstep",
                "Sunset dhoni cruises",
                "Floating breakfasts",
                "Open-air spa pavilion",
            ],
            "duration_nights": 5,
            "starting_price": 425000,
            "currency_code": "INR",
            "themes": ["beach", "romance", "wellness"],
            "story_overview": "An archipelago in slow motion — water that holds you, silence that lifts you, a sky that forgets to end.",
            "story_chapters": [
                {
                    "number": "01",
                    "title": "The Dream",
                    "body": "A seaplane lowers through cloud. Below: a string of green commas on a sheet of blue glass. Your destination is one of them.",
                    "image_url": "https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "02",
                    "title": "The Arrival",
                    "body": "Bare feet on warm timber. A chilled coconut. The ocean lapping below your bedroom — a sound you will dream about for years.",
                    "image_url": "https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "03",
                    "title": "The Stay",
                    "body": "A villa suspended above a private reef. A glass floor in your living room. A plunge pool that opens onto the lagoon. Sunsets that arrive in three colours.",
                    "image_url": "https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "04",
                    "title": "The Experiences",
                    "body": "Manta-ray snorkels at dawn. A floating breakfast of tropical fruit. An over-water spa where the therapist's voice competes with the tide — and loses.",
                    "image_url": "https://images.pexels.com/photos/9146381/pexels-photo-9146381.jpeg?auto=compress&cs=tinysrgb&w=2000",
                },
                {
                    "number": "05",
                    "title": "The Details",
                    "body": "Velaa Private Reserve — Baa Atoll. 47 villas. Reachable by 45-minute seaplane from Malé.",
                    "image_url": "https://images.unsplash.com/photo-1777199663418-3dd126c9fd40?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
            ],
            "is_featured": True,
            "sort_order": 2,
        },
        {
            "slug": "where-time-keeps-court",
            "title": "Where Time Keeps Court",
            "subtitle": "A heritage palace turned private sanctuary",
            "hero_tagline": "You will not be a guest here. You will be addressed as nobility.",
            "atmosphere": "heritage",
            "location_name": "Udaipur",
            "country": "India",
            "region": "Rajasthan",
            "property_name": "Taj Lake Palace",
            "hero_image_url": "https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.pexels.com/photos/14853538/pexels-photo-14853538.jpeg?auto=compress&cs=tinysrgb&w=2000",
            ],
            "amenities": [
                "Palace suites with hand-painted frescoes",
                "Royal butler service",
                "Private boat transfers across Lake Pichola",
                "Mewar-style banquets in marble pavilions",
                "Heritage walking tours by historians",
            ],
            "duration_nights": 3,
            "starting_price": 215000,
            "currency_code": "INR",
            "themes": ["heritage", "culture", "romance"],
            "story_overview": "An island palace afloat on Lake Pichola — where every threshold remembers a coronation and every meal is served with ceremony.",
            "story_chapters": [
                {
                    "number": "01",
                    "title": "The Dream",
                    "body": "Cross a lake at dusk. The palace ahead is the colour of moonlight on river-pearl. A boatman in white guides you toward a door that has welcomed kings.",
                    "image_url": "https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "02",
                    "title": "The Arrival",
                    "body": "Marigold petals on still water. A welcome of rosewater and silver. You step from boat to colonnade as a chorus of folk musicians lifts the evening.",
                    "image_url": "https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "03",
                    "title": "The Stay",
                    "body": "A suite once reserved for a queen. Hand-painted miniatures. A bathtub of beaten silver. Outside your window, the City Palace burns gold at sunset.",
                    "image_url": "https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
                {
                    "number": "04",
                    "title": "The Experiences",
                    "body": "A private dawn aarti at Jagdish Temple. Vintage car ride through old Udaipur. A thali of 26 dishes served in the lily pond pavilion.",
                    "image_url": "https://images.pexels.com/photos/14853538/pexels-photo-14853538.jpeg?auto=compress&cs=tinysrgb&w=2000",
                },
                {
                    "number": "05",
                    "title": "The Details",
                    "body": "Taj Lake Palace — Udaipur. 65 suites. Accessible only by private boat from Bansi Ghat.",
                    "image_url": "https://images.unsplash.com/photo-1659126574791-13313aa424bd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                },
            ],
            "is_featured": True,
            "sort_order": 3,
        },
    ]


def _seed_stories_payload():
    return [
        {
            "slug": "the-quiet-art-of-himalayan-mornings",
            "title": "The Quiet Art of Himalayan Mornings",
            "excerpt": "On waking up in a cedar forest, and what the mountains teach you about stillness.",
            "hero_image_url": "https://images.unsplash.com/photo-1672984233987-823df5fefb28?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            "body": "There is a particular shade of light at 6:14 a.m. in Mashobra. It does not announce itself. It simply arrives — slipping between the deodar branches like a confidence shared between old friends...",
            "author_name": "Anika Roy",
            "read_minutes": 6,
        },
        {
            "slug": "an-archipelago-of-second-chances",
            "title": "An Archipelago of Second Chances",
            "excerpt": "Why the Maldives is less a destination, and more a recalibration.",
            "hero_image_url": "https://images.unsplash.com/photo-1758717152007-6a2eb7299409?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            "body": "I came to the Maldives with a list. I left with none. There is a particular quality to being out of cellular range while the world makes its decisions without you...",
            "author_name": "Devraj Mehta",
            "read_minutes": 5,
        },
        {
            "slug": "the-palaces-still-listen",
            "title": "The Palaces Still Listen",
            "excerpt": "Three nights inside a floating Rajasthani palace, and what it remembers.",
            "hero_image_url": "https://images.unsplash.com/photo-1589352254486-4e1587272ea4?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            "body": "The thing about a palace built on a lake is that the marble holds sound differently. You begin to whisper without knowing why. You become an apprentice of restraint...",
            "author_name": "Imran Sayed",
            "read_minutes": 7,
        },
    ]


app.include_router(api)


@app.get("/")
def health():
    return {"app": "Pride Vacations", "ok": True}


# ---------------------------------------------------------------- extended catalog
def _ch(num, title, body, image_url):
    return {"number": num, "title": title, "body": body, "image_url": image_url}


def _full_catalog_payload():
    """Returns 9 additional cinematic experiences across atmospheres."""
    return [
        {
            "slug": "the-forest-whispers",
            "title": "The Forest Whispers",
            "subtitle": "A coffee-plantation retreat in the Western Ghats",
            "hero_tagline": "Listen carefully. The forest has been waiting for you.",
            "atmosphere": "forest",
            "location_name": "Coorg",
            "country": "India",
            "region": "Karnataka",
            "property_name": "Evolve Back, Coorg",
            "hero_image_url": "https://images.unsplash.com/photo-1559554498-8f51b3a96b1e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1559554498-8f51b3a96b1e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1518495973542-4542c06a5843?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1502082553048-f009c37129b9?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Private pool villas in a working coffee estate",
                "Plantation walks at dawn",
                "Open-air spa pavilions",
                "Coorgi-cuisine table d'hôte dinners",
                "Birding with a resident naturalist",
            ],
            "duration_nights": 4,
            "starting_price": 165000,
            "currency_code": "INR",
            "themes": ["forest", "wellness", "nature"],
            "story_overview": "A rainforest at altitude — where coffee blooms perfume the air and the only schedule that matters is the one the cicadas keep.",
            "story_chapters": [
                _ch("01", "The Dream", "You step off a winding ghat road into a green that hums. Somewhere a stream is hurrying. You are not.",
                    "https://images.unsplash.com/photo-1559554498-8f51b3a96b1e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A villa carved into the hillside, screened by jackfruit and silver oak. Your private pool catches the canopy.",
                    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "A plantation walk with the man who knows every tree by name. An iyengar yoga session beside a waterfall. A pandhi curry that you will be looking for in restaurants for the rest of your life.",
                    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 4,
        },
        {
            "slug": "between-two-deserts",
            "title": "Between Two Deserts",
            "subtitle": "A golden fort city and the sands beyond it",
            "hero_tagline": "Some places do not photograph. They have to be remembered.",
            "atmosphere": "heritage",
            "location_name": "Jaisalmer",
            "country": "India",
            "region": "Rajasthan",
            "property_name": "Suryagarh",
            "hero_image_url": "https://images.unsplash.com/photo-1599661046827-dacde6976549?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1599661046827-dacde6976549?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1477587458883-47145ed94245?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Sandstone suites with private courtyards",
                "A dawn camel ride into the Thar",
                "Folk musicians performing under the stars",
                "A private banquet on a sand dune",
                "Heritage walks inside Jaisalmer fort",
            ],
            "duration_nights": 3,
            "starting_price": 185000,
            "currency_code": "INR",
            "themes": ["heritage", "desert", "culture"],
            "story_overview": "Where the city is the same gold as the desert, and the line between them is a story you are about to walk into.",
            "story_chapters": [
                _ch("01", "The Dream", "Imagine a city built from honeyed sandstone, lit so completely by the sun that it appears to be on fire.",
                    "https://images.unsplash.com/photo-1599661046827-dacde6976549?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A modern fort in the spirit of the old one — vast courtyards, deep verandas, and a pool the colour of old turquoise.",
                    "https://images.unsplash.com/photo-1564507592333-c60657eea523?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "An evening in the dunes — camels, fireside Manganiyar music, a table set with copper and silver. The desert is the most generous host you will ever have.",
                    "https://images.unsplash.com/photo-1477587458883-47145ed94245?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 5,
        },
        {
            "slug": "salt-on-the-skin",
            "title": "Salt On The Skin",
            "subtitle": "A Portuguese-Goan villa above the Arabian Sea",
            "hero_tagline": "Late lunches. Long walks. A house that exhales.",
            "atmosphere": "beach",
            "location_name": "South Goa",
            "country": "India",
            "region": "Goa",
            "property_name": "The Postcard, Cuelim",
            "hero_image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Suites in a restored 18th-century manor",
                "A long, sea-view pool",
                "Lazy bicycles, hidden chapels",
                "Slow lunches of beach catch & feni",
                "Sunset cruises to dolphin coves",
            ],
            "duration_nights": 4,
            "starting_price": 95000,
            "currency_code": "INR",
            "themes": ["beach", "heritage", "slow-travel"],
            "story_overview": "A house with white linen curtains that lift when the sea breathes. A village whose church bells tell time better than your phone.",
            "story_chapters": [
                _ch("01", "The Dream", "Imagine an old Portuguese house on a hillside above the sea, where the floors are red oxide and the doors are taller than necessary.",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "Suites with high ceilings, four-poster beds and a balcony you will never quite leave. The cook will ask what you feel like eating today.",
                    "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "A morning at a quiet beach where the sand is the colour of cinnamon. A long lunch of clams and rice. A nap. A village walk at dusk. Repeat.",
                    "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 6,
        },
        {
            "slug": "monsoon-and-memory",
            "title": "Monsoon And Memory",
            "subtitle": "A tea-country estate written in rain",
            "hero_tagline": "Some travel changes you. This one quiets you.",
            "atmosphere": "forest",
            "location_name": "Munnar",
            "country": "India",
            "region": "Kerala",
            "property_name": "Windermere Estate",
            "hero_image_url": "https://images.unsplash.com/photo-1582719471385-0e0ee79e22e7?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1582719471385-0e0ee79e22e7?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1604608672516-f1b9b1d1bd02?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Cottages built around tea slopes",
                "A reading room with old novels",
                "Estate breakfasts on a covered veranda",
                "Tea factory visits & cuppings",
                "Spice-trail walks",
            ],
            "duration_nights": 4,
            "starting_price": 115000,
            "currency_code": "INR",
            "themes": ["forest", "tea", "monsoon"],
            "story_overview": "A planter's bungalow surrounded by terraces of tea — written into mist, written into rain.",
            "story_chapters": [
                _ch("01", "The Dream", "The bus from Cochin climbs. The light turns silver. The tea-rows begin to fold themselves into the hills like sentences into a paragraph.",
                    "https://images.unsplash.com/photo-1582719471385-0e0ee79e22e7?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A cottage with a fireplace, woven blankets, and a window that lets the monsoon do most of the talking.",
                    "https://images.unsplash.com/photo-1604608672516-f1b9b1d1bd02?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "A walk with the estate manager. A tea-tasting that ruins all other tea for you. A long afternoon doing absolutely nothing.",
                    "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 7,
        },
        {
            "slug": "snow-and-sandalwood",
            "title": "Snow And Sandalwood",
            "subtitle": "An apple-orchard retreat in the upper Himalayas",
            "hero_tagline": "Bring nothing but a kind heart and a thick coat.",
            "atmosphere": "mountain",
            "location_name": "Naldehra",
            "country": "India",
            "region": "Himachal Pradesh",
            "property_name": "Chalets Naldehra",
            "hero_image_url": "https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1551632811-561732d1e306?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Wooden chalets with woodburning stoves",
                "An apple orchard you can walk through",
                "A glass-fronted reading lounge",
                "Mountain-style breakfasts",
                "Bonfires under a winter sky",
            ],
            "duration_nights": 4,
            "starting_price": 135000,
            "currency_code": "INR",
            "themes": ["mountain", "winter", "romance"],
            "story_overview": "A pocket of stillness where the cedars are taller than the houses, and the houses are warmer than the cities.",
            "story_chapters": [
                _ch("01", "The Dream", "Imagine arriving somewhere where the only sound is the snow making up its mind whether or not to fall.",
                    "https://images.unsplash.com/photo-1551524559-8af4e6624178?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A chalet built of cedar and stone. A four-poster covered in a quilt your grandmother would have approved of.",
                    "https://images.unsplash.com/photo-1551632811-561732d1e306?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "A snow walk to a temple. A bonfire with kahwa. A dinner of rajma and rice you remember for years.",
                    "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 8,
        },
        {
            "slug": "the-river-remembers-you",
            "title": "The River Remembers You",
            "subtitle": "A wellness ashram above the Ganges",
            "hero_tagline": "You did not come here to be different. You came here to remember.",
            "atmosphere": "forest",
            "location_name": "Rishikesh",
            "country": "India",
            "region": "Uttarakhand",
            "property_name": "Ananda in the Himalayas",
            "hero_image_url": "https://images.unsplash.com/photo-1545158539-1709ea8a14e1?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1545158539-1709ea8a14e1?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Daily ayurveda consultations",
                "Heritage palace block of suites",
                "Hatha & vinyasa yoga at sunrise",
                "Ganga aarti by private boat",
                "Sattvic plant-led tasting menus",
            ],
            "duration_nights": 7,
            "starting_price": 285000,
            "currency_code": "INR",
            "themes": ["wellness", "spiritual", "river"],
            "story_overview": "An ashram-spa above the river — where each day begins with breath and ends with silence.",
            "story_chapters": [
                _ch("01", "The Dream", "You arrive carrying things you did not pack. Stress. Speed. A version of you that is going to be set down here.",
                    "https://images.unsplash.com/photo-1545158539-1709ea8a14e1?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A suite in an old maharaja's palace, then a cottage in the forest. Your day begins when the bell rings — gently.",
                    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "Daily abhyanga oil massages. An ayurvedic doctor who looks at you twice and seems to know things. The Ganga aarti — by boat.",
                    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": True,
            "sort_order": 9,
        },
        {
            "slug": "an-island-without-clocks",
            "title": "An Island Without Clocks",
            "subtitle": "A barefoot luxury hideaway in the Andamans",
            "hero_tagline": "Forty-eight kinds of blue. None of them are the same.",
            "atmosphere": "beach",
            "location_name": "Havelock Island",
            "country": "India",
            "region": "Andaman & Nicobar",
            "property_name": "Taj Exotica Andamans",
            "hero_image_url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1559827260-dc66d52bef19?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1571406384350-a9c08f5b0ff7?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Andamanese-style timber villas",
                "Private plunge pools facing the bay",
                "Reef snorkelling at first light",
                "Slow seafood lunches",
                "Sunset kayaking",
            ],
            "duration_nights": 5,
            "starting_price": 195000,
            "currency_code": "INR",
            "themes": ["beach", "nature", "adventure"],
            "story_overview": "Where the sand is so white it argues with the sky, and the days unspool like the tide.",
            "story_chapters": [
                _ch("01", "The Dream", "A two-hour ferry from Port Blair. The colour of the water gets impossible. You stop trying to describe it.",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A timber villa under a tropical canopy. A private deck. A pool that mirrors the sky.",
                    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "Snorkel at Radhanagar. A bonfire at Elephant Beach. A sea-bass for dinner that arrived an hour ago.",
                    "https://images.unsplash.com/photo-1571406384350-a9c08f5b0ff7?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 10,
        },
        {
            "slug": "the-light-of-jodhpur",
            "title": "The Light Of Jodhpur",
            "subtitle": "A heritage haveli inside the blue city",
            "hero_tagline": "Some cities are buildings. This one is a colour.",
            "atmosphere": "heritage",
            "location_name": "Jodhpur",
            "country": "India",
            "region": "Rajasthan",
            "property_name": "RAAS Jodhpur",
            "hero_image_url": "https://images.unsplash.com/photo-1599661046827-dacde6976549?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1568659585038-6ed8aafd7f8b?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1583309217394-d9d5b1a07f9c?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Suites looking onto Mehrangarh fort",
                "A red-sandstone pool at twilight",
                "Private fort tour at dawn",
                "Rooftop dinners at Baradari",
                "Old-city bazaar walks with a historian",
            ],
            "duration_nights": 3,
            "starting_price": 165000,
            "currency_code": "INR",
            "themes": ["heritage", "culture", "city"],
            "story_overview": "A boutique haveli within a walled city — every window framed by a fort, every meal told as a story.",
            "story_chapters": [
                _ch("01", "The Dream", "The fort rises out of rock like an exhale. The city below it has decided to be blue, and you do not question it.",
                    "https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A suite of red sandstone and white linen, with a window that frames the fort like a painting.",
                    "https://images.unsplash.com/photo-1568659585038-6ed8aafd7f8b?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "Mehrangarh at dawn before the crowd. Lunch in an old courtyard. A rooftop dinner under three thousand stars.",
                    "https://images.unsplash.com/photo-1583309217394-d9d5b1a07f9c?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 11,
        },
        {
            "slug": "silence-in-the-sand",
            "title": "Silence In The Sand",
            "subtitle": "A salt-desert sanctuary in the Rann of Kutch",
            "hero_tagline": "When the world goes white, you hear yourself again.",
            "atmosphere": "heritage",
            "location_name": "Bhuj",
            "country": "India",
            "region": "Gujarat",
            "property_name": "Rann Riders",
            "hero_image_url": "https://images.unsplash.com/photo-1612296727716-d6c69fc1ad62?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400",
            "gallery": [
                "https://images.unsplash.com/photo-1612296727716-d6c69fc1ad62?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1546484959-f9a381d1330d?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
                "https://images.unsplash.com/photo-1518542698743-ee3220abd6da?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            ],
            "amenities": [
                "Bhunga-style cottages with private patios",
                "A full-moon walk on the white desert",
                "Craft village visits — Banni, Hodka",
                "Folk music by the bonfire",
                "Birdwatching in the Little Rann",
            ],
            "duration_nights": 3,
            "starting_price": 85000,
            "currency_code": "INR",
            "themes": ["heritage", "desert", "craft"],
            "story_overview": "An expanse of salt that goes silver under the moon. A village of artisans nearby. A sky larger than you remembered.",
            "story_chapters": [
                _ch("01", "The Dream", "You drive across a road that begins to disagree with the idea of a road. The land becomes white. You are arriving somewhere.",
                    "https://images.unsplash.com/photo-1612296727716-d6c69fc1ad62?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("02", "The Stay", "A bhunga — a circular mud cottage with a roof painted by hand. Inside, it is cool and quiet.",
                    "https://images.unsplash.com/photo-1546484959-f9a381d1330d?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
                _ch("03", "The Experiences", "The white desert under a full moon. A morning with a Rabari weaver. A dinner of dal-pakwan that tastes like someone's grandmother made it.",
                    "https://images.unsplash.com/photo-1518542698743-ee3220abd6da?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000"),
            ],
            "is_featured": False,
            "sort_order": 12,
        },
    ]


def _extra_stories_payload():
    return [
        {
            "slug": "a-letter-to-anyone-who-hasnt-traveled-alone",
            "title": "A Letter To Anyone Who Hasn't Traveled Alone",
            "excerpt": "What a single suitcase, an unspoken language, and three slow weeks taught me.",
            "hero_image_url": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            "body": "I want to tell you what nobody told me, before I went. That you will be afraid at the airport. That you will sit on the plane and wonder what on earth you were thinking. That you will land, and the air will smell new...",
            "author_name": "Aanya Verma",
            "read_minutes": 8,
        },
        {
            "slug": "the-best-meal-i-ever-had-was-not-in-a-restaurant",
            "title": "The Best Meal I Ever Had Was Not In A Restaurant",
            "excerpt": "On a fishing boat off Havelock, with a chef who didn't know he was one.",
            "hero_image_url": "https://images.unsplash.com/photo-1559339352-11d035aa65de?crop=entropy&cs=srgb&fm=jpg&q=90&w=2000",
            "body": "He cooked it on a kerosene stove. He used three things. One was salt. I have eaten in many of the celebrated dining rooms of the world. None of them have come close...",
            "author_name": "Kabir Joshi",
            "read_minutes": 5,
        },
    ]
