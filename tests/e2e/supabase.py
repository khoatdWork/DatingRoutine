"""Exercise the Supabase build with a seeded session and intercepted API requests."""

import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

APP_URL = os.environ.get("E2E_URL", "http://127.0.0.1:4173/")
API_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
API_HOST = urlsplit(API_URL).netloc
PROJECT = json.loads(
    (Path(__file__).resolve().parents[2] / "project.config.json").read_text(encoding="utf-8")
)
NAMESPACE = PROJECT["storageKey"]
SESSION_KEY = f"{NAMESPACE}:supabase-auth:{API_HOST}"
GUEST_KEY = f"{NAMESPACE}:workspace:guest"
UID = "740b5a8c-b63a-41e6-9df0-76bd43d7dd35"
ACCOUNT_KEY = f"{NAMESPACE}:workspace-v2:" + json.dumps(
    ["supabase", API_URL, UID], separators=(",", ":")
)
USER = {
    "id": UID,
    "aud": "authenticated",
    "role": "authenticated",
    "email": "mock-user@example.invalid",
    "is_anonymous": False,
    "app_metadata": {"provider": "google"},
    "user_metadata": {"full_name": "Mock Supabase"},
}
GUEST_TITLE = "Guest note"
ACCOUNT_TITLE = "Account note"
CLOUD_TITLE = "Cloud note"


def base64_json(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")


def fake_session():
    expires_at = int(time.time()) + 3600
    header = base64_json({"alg": "HS256", "typ": "JWT"})
    claims = base64_json({"sub": UID, "aud": "authenticated", "exp": expires_at})
    return {
        "access_token": f"{header}.{claims}.dGVzdA",
        "refresh_token": "test-refresh-token",
        "expires_in": 3600,
        "expires_at": expires_at,
        "token_type": "bearer",
        "user": USER,
    }


def stored(page, key):
    return page.evaluate("(key) => JSON.parse(localStorage.getItem(key))", key)


def nav(page, label):
    page.get_by_role("navigation").get_by_role("button", name=label, exact=True).click()


def open_account(page):
    nav(page, "C\u00e0i \u0111\u1eb7t")
    page.get_by_role("button", name="T\u00e0i kho\u1ea3n & \u0111\u1ed3ng b\u1ed9", exact=True).click()


def create_note(page, title):
    page.get_by_role("button", name="T\u1ea1o ghi ch\u00fa \u0111\u1ea7u ti\u00ean").click()
    page.get_by_label("Ti\u00eau \u0111\u1ec1", exact=True).fill(title)
    page.get_by_role("button", name="L\u01b0u ghi ch\u00fa", exact=True).click()
    expect(page.get_by_text(title, exact=True)).to_be_visible()


def run(browser):
    assert PROJECT["dataProvider"] == "supabase", "Select Supabase before building"
    context = browser.new_context(service_workers="block")
    page = context.new_page()
    errors = []
    unexpected = []
    reads = []
    writes = []
    logouts = []
    remote = None
    fail_read = False
    page.on("pageerror", lambda error: errors.append(str(error)))

    def respond(route, status, value=None):
        options = {
            "status": status,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        }
        if value is not None:
            options["json"] = value
        route.fulfill(**options)

    def mock_supabase(route):
        request = route.request
        url = urlsplit(request.url)
        if request.method == "OPTIONS":
            respond(route, 204)
        elif url.path.endswith("/auth/v1/user") and request.method == "GET":
            respond(route, 200, USER)
        elif url.path.endswith("/auth/v1/logout") and request.method == "POST":
            logouts.append(request)
            respond(route, 204)
        elif url.path.endswith("/rest/v1/note_workspaces") and request.method == "GET":
            reads.append(request)
            if fail_read:
                respond(route, 403, {"code": "42501", "message": "Mock read denied"})
            else:
                respond(route, 200, [remote] if remote else [])
        elif url.path.endswith("/rest/v1/rpc/write_note_workspace") and request.method == "POST":
            writes.append(route)
        else:
            unexpected.append(f"{request.method} {url.path}")
            respond(route, 404, {"message": "Unexpected Supabase request"})

    context.route(f"{API_URL}/**", mock_supabase)
    page.goto(APP_URL)
    create_note(page, GUEST_TITLE)
    guest_before = stored(page, GUEST_KEY)
    session = fake_session()
    page.evaluate(
        "([key, session]) => localStorage.setItem(key, JSON.stringify(session))",
        [SESSION_KEY, session],
    )
    page.reload()
    open_account(page)
    expect(page.get_by_role("heading", name="Mock Supabase")).to_be_visible()
    expect(page.get_by_text(USER["email"], exact=True)).to_be_visible()
    assert stored(page, ACCOUNT_KEY) is None
    assert not reads and not writes

    nav(page, "Trang ch\u1ee7")
    expect(page.get_by_text(GUEST_TITLE, exact=True)).to_have_count(0)
    create_note(page, ACCOUNT_TITLE)
    saved = stored(page, ACCOUNT_KEY)
    assert saved["snapshot"]["notes"][0]["title"] == ACCOUNT_TITLE
    assert saved["dirty"] is True and saved["cloudVersion"] is None
    assert stored(page, GUEST_KEY) == guest_before
    assert not reads and not writes

    open_account(page)
    sync_button = page.get_by_role("button", name="\u0110\u1ed3ng b\u1ed9 ngay", exact=True)
    success = page.get_by_text("\u0110\u00e3 \u0111\u01b0\u1ee3c Supabase x\u00e1c nh\u1eadn l\u00fac", exact=False)
    with page.expect_request(lambda request: request.url.endswith("/rpc/write_note_workspace")):
        sync_button.click()
    expect(page.get_by_role("button", name="\u0110ang \u0111\u1ed3ng b\u1ed9\u2026")).to_be_disabled()
    expect(success).to_have_count(0)
    assert stored(page, ACCOUNT_KEY) == saved
    assert len(reads) == len(writes) == 1
    assert parse_qs(urlsplit(reads[0].url).query)["owner_id"] == [f"eq.{UID}"]
    write = writes[0]
    assert write.request.header_value("authorization") == f"Bearer {session['access_token']}"
    assert write.request.post_data_json == {
        "p_owner_id": UID,
        "p_expected_version": 0,
        "p_snapshot": saved["snapshot"],
    }
    respond(write, 200, 1)
    expect(success).to_be_visible()
    assert stored(page, ACCOUNT_KEY)["cloudVersion"] == 1
    assert stored(page, ACCOUNT_KEY)["dirty"] is False

    nav(page, "Ghi ch\u00fa")
    page.locator("button.note-copy").filter(has_text=ACCOUNT_TITLE).click()
    revised_title = "Account edit"
    page.get_by_label("Ti\u00eau \u0111\u1ec1", exact=True).fill(revised_title)
    page.get_by_role("button", name="L\u01b0u ghi ch\u00fa", exact=True).click()
    expect(page.get_by_text(revised_title, exact=True)).to_be_visible()
    dirty = stored(page, ACCOUNT_KEY)
    open_account(page)
    fail_read = True
    sync_button.click()
    expect(page.get_by_text("Ch\u01b0a \u0111\u1ecdc \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u Supabase", exact=False)).to_be_visible()
    expect(success).to_have_count(0)
    assert stored(page, ACCOUNT_KEY) == dirty
    assert len(writes) == 1

    fail_read = False
    cloud_snapshot = saved["snapshot"]
    cloud_snapshot["notes"][0]["title"] = CLOUD_TITLE
    remote = {"version": 2, "snapshot": cloud_snapshot}
    sync_button.click()
    expect(page.get_by_text("Thi\u1ebft b\u1ecb v\u00e0 \u0111\u00e1m m\u00e2y c\u00f3 thay \u0111\u1ed5i ri\u00eang", exact=False)).to_be_visible()
    expect(success).to_have_count(0)
    assert stored(page, ACCOUNT_KEY) == dirty
    assert len(writes) == 1

    pull = page.get_by_role("button", name="T\u1ea3i b\u1ea3n \u0111\u00e1m m\u00e2y", exact=True)
    dialog = page.get_by_role("alertdialog")
    reads_before = len(reads)
    pull.click()
    expect(dialog).to_be_visible()
    dialog.get_by_role("button", name="Quay l\u1ea1i", exact=True).click()
    assert len(reads) == reads_before
    assert stored(page, ACCOUNT_KEY) == dirty
    pull.click()
    dialog.get_by_role("button", name="T\u1ea3i b\u1ea3n \u0111\u00e1m m\u00e2y", exact=True).click()
    expect(success).to_be_visible()
    pulled = stored(page, ACCOUNT_KEY)
    assert pulled["snapshot"] == cloud_snapshot
    assert pulled["cloudVersion"] == 2 and pulled["dirty"] is False
    assert len(reads) == reads_before + 1 and len(writes) == 1

    page.get_by_role("button", name="\u0110\u0103ng xu\u1ea5t", exact=True).click()
    expect(page.get_by_role("heading", name="Mock Supabase")).to_have_count(0)
    nav(page, "Ghi ch\u00fa")
    expect(page.get_by_text(GUEST_TITLE, exact=True)).to_be_visible()
    expect(page.get_by_text(CLOUD_TITLE, exact=True)).to_have_count(0)
    assert len(logouts) == 1 and stored(page, SESSION_KEY) is None
    assert stored(page, GUEST_KEY) == guest_before
    assert stored(page, ACCOUNT_KEY) == pulled
    assert not unexpected, unexpected
    assert not errors, errors
    context.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            run(browser)
        finally:
            browser.close()
    print("PASS Chromium: mocked Supabase session, isolated storage, sync, conflict, pull, logout", flush=True)
