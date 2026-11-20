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
GUEST_KEY = f"{NAMESPACE}:trips-v1:guest"
UID = "740b5a8c-b63a-41e6-9df0-76bd43d7dd35"
ACCOUNT_KEY = f"{NAMESPACE}:trips-v1:" + json.dumps(
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
GUEST_TITLE = "Guest trip"
ACCOUNT_TITLE = "Account trip"
CLOUD_TITLE = "Cloud trip"
PHOTO_ID = "bb223333-4444-5555-6666-777788889999"
PHOTO_PUBLIC_ID = f"dating-routine-v1/{UID}/{PHOTO_ID}"
PHOTO = {
    "id": PHOTO_ID,
    "publicId": PHOTO_PUBLIC_ID,
    "url": f"https://res.cloudinary.com/mock/image/authenticated/s--{'A' * 32}--/v123/{PHOTO_PUBLIC_ID}.png",
    "width": 1,
    "height": 1,
    "caption": "",
}
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII="
)


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


def fill_trip(page, title):
    page.get_by_role("banner").get_by_role("button", name="Th\u00eam chuy\u1ebfn \u0111i").click()
    page.get_by_label("T\u00ean chuy\u1ebfn \u0111i", exact=True).fill(title)
    page.get_by_label("\u0110\u1ecba \u0111i\u1ec3m", exact=True).fill("Mock destination")


def save_trip(page, title):
    page.get_by_role("button", name="L\u01b0u chuy\u1ebfn \u0111i", exact=True).click()
    expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()


def run(browser):
    assert PROJECT["dataProvider"] == "supabase", "Select Supabase before building"
    context = browser.new_context(service_workers="block")
    page = context.new_page()
    errors = []
    unexpected = []
    reads = []
    writes = []
    logouts = []
    uploads = []
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
        elif url.path.endswith("/rest/v1/trip_workspaces") and request.method == "GET":
            reads.append(request)
            if fail_read:
                respond(route, 403, {"code": "42501", "message": "Mock read denied"})
            else:
                respond(route, 200, [remote] if remote else [])
        elif url.path.endswith("/rest/v1/rpc/write_trip_workspace") and request.method == "POST":
            writes.append(route)
        elif url.path.endswith("/functions/v1/cloudinary") and request.method == "POST":
            uploads.append(request)
            respond(route, 200, PHOTO)
        else:
            unexpected.append(f"{request.method} {url.path}")
            respond(route, 404, {"message": "Unexpected Supabase request"})

    context.route(f"{API_URL}/**", mock_supabase)
    context.route(PHOTO["url"], lambda route: route.fulfill(content_type="image/png", body=PNG))
    page.goto(APP_URL)
    fill_trip(page, GUEST_TITLE)
    save_trip(page, GUEST_TITLE)
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

    nav(page, "Nh\u1eadt k\u00fd")
    expect(page.get_by_text(GUEST_TITLE, exact=True)).to_have_count(0)
    fill_trip(page, ACCOUNT_TITLE)
    with page.expect_response(lambda response: response.url.endswith("/functions/v1/cloudinary")):
        page.locator('input[type="file"]').set_input_files(
            {"name": "trip.png", "mimeType": "image/png", "buffer": PNG}
        )
    expect(page.locator(f'img[src="{PHOTO["url"]}"]')).to_be_visible()
    assert len(uploads) == 1
    assert uploads[0].header_value("authorization") == f"Bearer {session['access_token']}"
    assert uploads[0].header_value("content-type") == "image/png"
    assert uploads[0].post_data_buffer == PNG
    assert stored(page, ACCOUNT_KEY) is None
    save_trip(page, ACCOUNT_TITLE)
    saved = stored(page, ACCOUNT_KEY)
    assert saved["snapshot"]["trips"][0]["title"] == ACCOUNT_TITLE
    assert saved["snapshot"]["trips"][0]["photos"] == [PHOTO]
    assert saved["dirty"] is True and saved["cloudVersion"] is None
    assert stored(page, GUEST_KEY) == guest_before
    assert not reads and not writes

    open_account(page)
    sync_button = page.get_by_role("button", name="\u0110\u1ed3ng b\u1ed9 ngay", exact=True)
    success = page.get_by_text("\u0110\u00e3 \u0111\u01b0\u1ee3c Supabase x\u00e1c nh\u1eadn l\u00fac", exact=False)
    with page.expect_request(lambda request: request.url.endswith("/rpc/write_trip_workspace")):
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

    nav(page, "Chuy\u1ebfn \u0111i")
    page.get_by_role("button", name=ACCOUNT_TITLE, exact=False).click()
    page.get_by_role("button", name="Ch\u1ec9nh s\u1eeda", exact=True).click()
    revised_title = "Account edit"
    page.get_by_label("T\u00ean chuy\u1ebfn \u0111i", exact=True).fill(revised_title)
    save_trip(page, revised_title)
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
    cloud_snapshot["trips"][0]["title"] = CLOUD_TITLE
    remote = {"version": 2, "snapshot": cloud_snapshot}
    sync_button.click()
    expect(page.get_by_text("\u0110\u00e1m m\u00e2y \u0111\u00e3 thay \u0111\u1ed5i", exact=False)).to_be_visible()
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
    nav(page, "Chuy\u1ebfn \u0111i")
    expect(page.get_by_text(CLOUD_TITLE, exact=True)).to_be_visible()
    expect(page.get_by_text(revised_title, exact=True)).to_have_count(0)

    draft_title = "Account draft during external signout"
    fill_trip(page, draft_title)
    add_photo = page.get_by_role("button", name="Th\u00eam \u1ea3nh", exact=True)
    expect(add_photo).to_be_visible()
    second_tab = context.new_page()
    second_tab.goto(APP_URL)
    open_account(second_tab)
    second_tab.get_by_role("button", name="\u0110\u0103ng xu\u1ea5t", exact=True).click()
    expect(second_tab.get_by_role("heading", name="Mock Supabase")).to_have_count(0)

    notice = page.get_by_text("Phi\u00ean t\u00e0i kho\u1ea3n \u0111\u00e3 thay \u0111\u1ed5i", exact=False)
    expect(notice).to_be_visible()
    expect(page.get_by_label("T\u00ean chuy\u1ebfn \u0111i", exact=True)).to_have_value(draft_title)
    expect(add_photo).to_have_count(0)
    assert stored(page, ACCOUNT_KEY) == pulled
    page.get_by_role("button", name="L\u01b0u chuy\u1ebfn \u0111i", exact=True).click()
    expect(notice).to_have_count(0)
    nav(page, "Chuy\u1ebfn \u0111i")
    expect(page.get_by_text(GUEST_TITLE, exact=True)).to_be_visible()
    expect(page.get_by_text(CLOUD_TITLE, exact=True)).to_have_count(0)
    expect(page.get_by_text(draft_title, exact=True)).to_have_count(0)
    assert len(logouts) == 1 and stored(page, SESSION_KEY) is None
    assert stored(page, GUEST_KEY) == guest_before
    account = stored(page, ACCOUNT_KEY)
    assert [trip["title"] for trip in account["snapshot"]["trips"]] == [draft_title, CLOUD_TITLE]
    assert account["dirty"] is True and account["cloudVersion"] == 2
    assert len(uploads) == len(writes) == 1
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
    print("PASS Chromium: mocked Supabase and Cloudinary, sync conflict and pull, external signout preserves draft", flush=True)
