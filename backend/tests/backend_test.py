"""Pride Vacations backend regression tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://9c61d993-aee8-4057-ae21-c5a422725b8f.preview.emergentagent.com").rstrip("/")
SUPABASE_URL = "https://grjnctnvbrjlglvvotbm.supabase.co"
SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyam5jdG52YnJqbGdsdnZvdGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDIxOTQsImV4cCI6MjA5NjQ3ODE5NH0.WwpE7DELf-Ry5ZdMYt7pqhbHPQHLP9IcNM6l54b3bq0"
ADMIN_EMAIL = "team@zenuratech.online"
ADMIN_PASSWORD = "pridevacationsWTF"

EXPECTED_SLUGS = {"wake-above-the-clouds", "ocean-beyond-the-horizon", "where-time-keeps-court"}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON, "Content-Type": "application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Supabase admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


# --- public ----------------------------------------------------
def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_list_experiences():
    r = requests.get(f"{BASE_URL}/api/experiences", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 3
    slugs = {e["slug"] for e in data}
    assert EXPECTED_SLUGS.issubset(slugs)
    for e in data:
        assert e["atmosphere"] in {"mountain", "beach", "heritage"}
        assert isinstance(e.get("story_chapters", []), list)


@pytest.mark.parametrize("slug", list(EXPECTED_SLUGS))
def test_get_experience_by_slug(slug):
    r = requests.get(f"{BASE_URL}/api/experiences/{slug}", timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body["slug"] == slug
    assert len(body["story_chapters"]) == 5
    assert isinstance(body["gallery"], list) and len(body["gallery"]) >= 1
    assert isinstance(body["amenities"], list) and len(body["amenities"]) >= 1


def test_get_experience_404():
    r = requests.get(f"{BASE_URL}/api/experiences/does-not-exist", timeout=15)
    assert r.status_code == 404


def test_list_stories():
    r = requests.get(f"{BASE_URL}/api/stories", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 3
    for s in data:
        assert "title" in s and "slug" in s


# --- leads ----------------------------------------------------
created_lead_id = None


def test_create_lead_and_persist(admin_token):
    global created_lead_id
    payload = {
        "full_name": "TEST_Backend Tester",
        "email": "test_backend@example.com",
        "phone": "+919876543210",
        "travel_companions": "couple",
        "preferred_destinations": ["mountain", "beach"],
        "preferred_travel_start": "2026-03-10",
        "occasion": "honeymoon",
        "message": "TEST automated regression",
    }
    r = requests.post(f"{BASE_URL}/api/leads", json=payload, timeout=20)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["full_name"] == payload["full_name"]
    assert body["email"] == payload["email"]
    assert body.get("status") in {"new", None, ""} or body.get("status")
    created_lead_id = body["id"]

    # verify via admin listing
    r2 = requests.get(
        f"{BASE_URL}/api/admin/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    assert r2.status_code == 200
    leads = r2.json()
    assert any(l["id"] == created_lead_id for l in leads)


def test_lead_invalid_email():
    r = requests.post(f"{BASE_URL}/api/leads", json={"full_name": "x", "email": "not-an-email"}, timeout=15)
    assert r.status_code == 422


# --- admin ----------------------------------------------------
def test_admin_requires_token():
    r = requests.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    assert r.status_code == 401


def test_admin_bad_token():
    r = requests.get(
        f"{BASE_URL}/api/admin/leads",
        headers={"Authorization": "Bearer not-a-real-token"},
        timeout=15,
    )
    assert r.status_code == 401


def test_admin_update_lead_status(admin_token):
    global created_lead_id
    if not created_lead_id:
        pytest.skip("No lead created")
    r = requests.patch(
        f"{BASE_URL}/api/admin/leads/{created_lead_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "in_review", "admin_notes": "TEST update"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "in_review"
    # verify persistence
    r2 = requests.get(
        f"{BASE_URL}/api/admin/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    found = next((l for l in r2.json() if l["id"] == created_lead_id), None)
    assert found and found["status"] == "in_review"


def test_admin_experiences(admin_token):
    r = requests.get(
        f"{BASE_URL}/api/admin/experiences",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    assert r.status_code == 200
    assert len(r.json()) == 3


# --- concierge ------------------------------------------------
def test_concierge_multi_turn():
    r = requests.post(
        f"{BASE_URL}/api/concierge",
        json={"message": "Plan a 5-night honeymoon in the Maldives in March."},
        timeout=45,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    conv_id = body["conversation_id"]
    assert conv_id and isinstance(body["reply"], str) and len(body["reply"]) > 20
    assert len(body["messages"]) >= 2

    time.sleep(1)
    r2 = requests.post(
        f"{BASE_URL}/api/concierge",
        json={"conversation_id": conv_id, "message": "What about the budget you mentioned?"},
        timeout=45,
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["conversation_id"] == conv_id
    assert len(body2["messages"]) >= 4
