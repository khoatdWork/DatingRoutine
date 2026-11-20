import json
import os
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("E2E_URL", "http://127.0.0.1:4173/")
OUTPUT = Path("output/screenshots")
OUTPUT.mkdir(parents=True, exist_ok=True)
AXE = Path("node_modules/axe-core/axe.min.js").read_text(encoding="utf-8")

def audit(page, label):
    page.wait_for_function("document.getAnimations().every(animation => animation.playState !== 'running')")
    page.wait_for_function("[...document.querySelectorAll('[data-sonner-toast]')].every(el => getComputedStyle(el).opacity === '1')")
    page.add_script_tag(content=AXE)
    failures = page.evaluate("""async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v => ({id:v.id, description:v.description, nodes:v.nodes.map(n=>({html:n.html,detail:n.any}))}))""")
    assert not failures, f"Accessibility {label}: {json.dumps(failures, ensure_ascii=True)}"
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Overflow: {label}"

def nav(page, label):
    page.get_by_role("navigation").get_by_role("button", name=label, exact=True).click()

def run(browser, engine):
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name="Không gian của bạn.")).to_be_visible()
    audit(page, f"{engine} home")
    page.screenshot(path=str(OUTPUT / f"{engine}-home.png"), full_page=True)
    page.get_by_role("button", name="Tạo ghi chú đầu tiên").click()
    page.get_by_label("Tiêu đề", exact=True).fill("Ý tưởng cho dự án mới")
    page.get_by_label("Nội dung", exact=False).fill("Nội dung tiếng Việt\nDòng thứ hai")
    nav(page, "Trang chủ")
    expect(page.get_by_role("alertdialog")).to_be_visible()
    page.get_by_role("button", name="Quay lại", exact=True).click()
    expect(page.get_by_label("Tiêu đề", exact=True)).to_have_value("Ý tưởng cho dự án mới")
    page.get_by_role("button", name="Lưu ghi chú", exact=True).click()
    expect(page.get_by_text("Ý tưởng cho dự án mới", exact=True)).to_be_visible()
    page.reload()
    page.wait_for_load_state("networkidle")
    nav(page, "Ghi chú")
    page.get_by_label("Đánh dấu hoàn tất: Ý tưởng cho dự án mới", exact=True).click()
    page.get_by_role("group", name="Lọc ghi chú").get_by_role("button", name="Đã xong", exact=True).click()
    expect(page.get_by_text("Ý tưởng cho dự án mới", exact=True)).to_be_visible()
    page.get_by_label("Tìm ghi chú").fill("không-tồn-tại")
    expect(page.get_by_text("Chưa tìm thấy ghi chú", exact=True)).to_be_visible()
    page.get_by_label("Tìm ghi chú").fill("")
    audit(page, f"{engine} notes")
    nav(page, "Thành phần")
    audit(page, f"{engine} components")
    page.get_by_role("button", name="Xóa mẫu", exact=True).click()
    page.get_by_role("button", name="Thử xác nhận", exact=True).click()
    nav(page, "Cài đặt")
    audit(page, f"{engine} settings")
    page.screenshot(path=str(OUTPUT / f"{engine}-settings.png"), full_page=True)
    page.get_by_role("button", name="Hồ sơ", exact=True).click()
    page.get_by_label("Tên hiển thị", exact=True).fill("An")
    page.get_by_role("button", name="Lưu hồ sơ", exact=True).click()
    nav(page, "Trang chủ")
    expect(page.get_by_role("heading", name="Chào An.")).to_be_visible()
    nav(page, "Cài đặt")
    page.get_by_role("button", name="Giao diện", exact=True).click()
    page.get_by_role("button", name="Tối", exact=True).click()
    expect(page.locator("html")).to_have_class("dark")
    audit(page, f"{engine} dark appearance")
    page.screenshot(path=str(OUTPUT / f"{engine}-dark.png"), full_page=True)
    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator("html")).to_have_class("dark")
    nav(page, "Cài đặt")
    page.get_by_role("button", name="Giao diện", exact=True).click()
    page.get_by_role("button", name="Sáng", exact=True).click()
    nav(page, "Cài đặt")
    page.get_by_role("button", name="Bản sao lưu", exact=True).click()
    with page.expect_download() as download:
        page.get_by_role("button", name="Xuất bản sao lưu", exact=True).click()
    backup_path = OUTPUT.parent / f"{engine}-backup.json"
    download.value.save_as(str(backup_path))
    backup = json.loads(backup_path.read_text(encoding="utf-8"))
    assert backup["notes"][0]["completed"] is True
    page.get_by_role("button", name="Xóa dữ liệu", exact=True).click()
    page.get_by_role("alertdialog").get_by_role("button", name="Quay lại", exact=True).click()
    page.get_by_label("Nhập bản sao lưu", exact=True).set_input_files({"name": "bad.json", "mimeType": "application/json", "buffer": b"{"})
    expect(page.get_by_text("Tệp này không phải JSON hợp lệ.", exact=True)).to_be_visible()
    page.get_by_role("button", name="Xóa dữ liệu", exact=True).click()
    page.get_by_role("alertdialog").get_by_role("button", name="Xóa dữ liệu", exact=True).click()
    page.get_by_label("Nhập bản sao lưu", exact=True).set_input_files(str(backup_path))
    page.get_by_role("alertdialog").get_by_role("button", name="Nhập bản sao lưu", exact=True).click()
    nav(page, "Trang chủ")
    expect(page.get_by_role("heading", name="Chào An.")).to_be_visible()
    page.set_viewport_size({"width": 320, "height": 740})
    audit(page, f"{engine} home 320")
    nav(page, "Cài đặt")
    audit(page, f"{engine} settings 320")
    page.get_by_role("button", name="Tài khoản & đồng bộ", exact=True).click()
    expect(page.get_by_text("Firebase chưa được cấu hình", exact=False)).to_be_visible()
    audit(page, f"{engine} account 320")
    page.screenshot(path=str(OUTPUT / f"{engine}-account-320.png"), full_page=True)
    # Isolate stale editors across real tabs, not a mocked repository.
    nav(page, "Ghi chú")
    page.locator("button.note-copy").filter(has_text="Ý tưởng cho dự án mới").click()
    page.get_by_label("Tiêu đề", exact=True).fill("Nháp tab cũ")
    other = context.new_page()
    other.goto(URL)
    other.wait_for_load_state("networkidle")
    nav(other, "Ghi chú")
    other.locator("button.note-copy").filter(has_text="Ý tưởng cho dự án mới").click()
    other.get_by_label("Tiêu đề", exact=True).fill("Bản mới từ tab khác")
    other.get_by_role("button", name="Lưu ghi chú", exact=True).click()
    page.get_by_role("button", name="Lưu ghi chú", exact=True).click()
    expect(page.get_by_text("Dữ liệu đã thay đổi ở cửa sổ khác.", exact=False)).to_be_visible()
    expect(page.get_by_label("Tiêu đề", exact=True)).to_have_value("Nháp tab cũ")
    nav(page, "Trang chủ")
    page.get_by_role("button", name="Bỏ thay đổi", exact=True).click()
    other.close()
    page.set_viewport_size({"width": 1280, "height": 900})
    assert page.locator(".app-frame").bounding_box()["width"] == 480
    page.screenshot(path=str(OUTPUT / f"{engine}-desktop.png"), full_page=True)
    manifest = page.evaluate("async () => await (await fetch(document.querySelector('link[rel=manifest]').href)).json()")
    assert manifest["scope"] == manifest["start_url"]
    assert manifest["display"] == "standalone"
    for icon in manifest["icons"]:
        assert page.request.get(urljoin(URL, icon["src"])).ok
    # Service worker checks on production Chromium. WebKit gets full UI regression above.
    if engine == "chromium":
        page.evaluate("async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange',r,{once:true})); }")
        context.set_offline(True)
        page.reload()
        expect(page.get_by_role("heading", name="Chào An.")).to_be_visible()
        page.get_by_role("button", name="Tạo ghi chú mới", exact=True).click()
        page.get_by_label("Tiêu đề", exact=True).fill("Ghi chú khi mất mạng")
        page.get_by_role("button", name="Lưu ghi chú", exact=True).click()
        page.reload()
        expect(page.get_by_role("heading", name="Chào An.")).to_be_visible()
        nav(page, "Ghi chú")
        expect(page.get_by_text("Ghi chú khi mất mạng", exact=True)).to_be_visible()
        context.set_offline(False)
        cached = page.evaluate("async () => (await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r=>r.url)))).flat()")
        assert not any("firestore" in url or "googleapis.com" in url for url in cached)
    assert not errors, f"Browser runtime errors: {errors}"
    context.close()
    print(f"PASS {engine}: CRUD, drafts, persistence, filters, theme, backup, stale tabs, a11y, responsive, manifest" + (", offline PWA" if engine == "chromium" else ""), flush=True)

with sync_playwright() as p:
    for engine in ["chromium", "webkit"]:
        browser = getattr(p, engine).launch(headless=True)
        try:
            run(browser, engine)
        finally:
            browser.close()
