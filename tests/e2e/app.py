import json
import os
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("E2E_URL", "http://127.0.0.1:4173/")
DATA_PROVIDER = os.environ.get("E2E_DATA_PROVIDER", "local")
ACCOUNT_NOTICE = {
    "local": "Ứng dụng chỉ lưu dữ liệu trên thiết bị này.",
    "firebase": "Firebase chưa được cấu hình",
    "supabase": "Supabase chưa được cấu hình",
}
OUTPUT = Path("output/screenshots")
OUTPUT.mkdir(parents=True, exist_ok=True)
AXE = Path("node_modules/axe-core/axe.min.js").read_text(encoding="utf-8")

def audit(page, label):
    expect(page.locator("[data-sonner-toast]")).to_have_count(0, timeout=10000)
    page.wait_for_function("document.getAnimations().every(animation => animation.playState !== 'running')")
    page.add_script_tag(content=AXE)
    failures = page.evaluate("""async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v => ({id:v.id, description:v.description, nodes:v.nodes.map(n=>({html:n.html,detail:n.any}))}))""")
    assert not failures, f"Accessibility {label}: {json.dumps(failures, ensure_ascii=True)}"
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Overflow: {label}"

def nav(page, label):
    page.get_by_role("navigation").get_by_role("button", name=label, exact=True).click()

def button(page, label):
    return page.get_by_role("button", name=label, exact=True)

def confirm(page, label):
    button(page.get_by_role("alertdialog"), label).click()

def open_trip(page, title):
    page.locator(".trip-card").filter(has_text=title).click()
    expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()

def add_expense(page, index, name, amount, category, payer):
    button(page, "Thêm khoản chi").click()
    expense = page.get_by_role("group", name=f"Khoản chi {index}", exact=True)
    expense.get_by_label("Tên khoản chi").fill(name)
    expense.get_by_label("Số tiền (VND)").fill(amount)
    expense.get_by_label("Hạng mục").select_option(category)
    expense.get_by_label("Người trả").select_option(payer)

def run(browser, engine):
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    external_requests = []
    app_url = urlsplit(URL)

    def record_external_request(request):
        remote = urlsplit(request.url)
        if remote.scheme in ("http", "https") and remote.netloc != app_url.netloc:
            external_requests.append(remote.hostname)

    context.on("request", record_external_request)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    expect(page.get_by_role("heading", name="Đi cùng nhau", exact=True)).to_be_visible()
    expect(page.get_by_text("Chưa có chuyến đi nào.", exact=True)).to_be_visible()
    audit(page, f"{engine} home")
    page.screenshot(path=str(OUTPUT / f"{engine}-home.png"), full_page=True)

    title = "Đà Lạt cuối tuần"
    button(page, "Chuyến đi mới").click()
    page.get_by_label("Tên chuyến đi").fill(title)
    page.get_by_label("Địa điểm").fill("Đà Lạt")
    page.get_by_label("Ngày đi").fill("2025-06-14")
    page.get_by_label("Ngày về").fill("2025-06-13")
    page.get_by_label("Ghi chú", exact=True).fill("Cà phê sáng\nĐi dạo quanh hồ")
    button(page, "Lưu chuyến đi").click()
    expect(page.get_by_text("Ngày về phải từ ngày đi trở đi.", exact=True)).to_be_visible()
    page.get_by_label("Ngày về").fill("2025-06-15")
    add_expense(page, 1, "Vé máy bay", "450000", "transport", "me")
    add_expense(page, 2, "Bữa tối", "250000", "food", "partner")
    nav(page, "Nhật ký")
    expect(page.get_by_role("alertdialog")).to_be_visible()
    confirm(page, "Quay lại")
    expect(page.get_by_label("Tên chuyến đi")).to_have_value(title)
    expect(page.get_by_label("Số tiền (VND)").last).to_have_value("250000")
    page.set_viewport_size({"width": 320, "height": 740})
    audit(page, f"{engine} editor 320")
    page.set_viewport_size({"width": 390, "height": 844})
    button(page, "Lưu chuyến đi").click()
    expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()
    expect(page.get_by_text("Vé máy bay", exact=True)).to_be_visible()
    audit(page, f"{engine} trip detail")
    page.screenshot(path=str(OUTPUT / f"{engine}-trip.png"), full_page=True)

    page.reload()
    page.wait_for_load_state("networkidle")
    nav(page, "Chuyến đi")
    page.get_by_label("Lọc theo năm").select_option("2025")
    search = page.get_by_label("Tìm chuyến đi")
    search.fill("không-tồn-tại")
    expect(page.get_by_text("Không tìm thấy chuyến đi phù hợp.", exact=True)).to_be_visible()
    search.fill("quanh hồ")
    open_trip(page, title)
    expect(page.get_by_text("Đi dạo quanh hồ", exact=False)).to_be_visible()
    nav(page, "Chi phí")
    expect(page.locator(".journey-summary")).to_contain_text("700.000")
    categories = page.get_by_role("region", name="Theo hạng mục")
    expect(categories).to_contain_text("Di chuyển")
    expect(categories).to_contain_text("250.000")
    payers = page.get_by_role("region", name="Theo người trả")
    expect(payers).to_contain_text("Mình")
    expect(payers).to_contain_text("450.000")
    audit(page, f"{engine} expenses")

    nav(page, "Cài đặt")
    audit(page, f"{engine} settings")
    page.screenshot(path=str(OUTPUT / f"{engine}-settings.png"), full_page=True)
    button(page, "Hồ sơ").click()
    page.get_by_label("Tên hiển thị", exact=True).fill("An")
    button(page, "Lưu hồ sơ").click()
    nav(page, "Nhật ký")
    expect(page.get_by_text("Chào An!", exact=True)).to_be_visible()
    nav(page, "Cài đặt")
    button(page, "Giao diện").click()
    button(page, "Tối").click()
    expect(page.locator("html")).to_have_class("dark")
    audit(page, f"{engine} dark appearance")
    page.screenshot(path=str(OUTPUT / f"{engine}-dark.png"), full_page=True)
    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator("html")).to_have_class("dark")
    nav(page, "Cài đặt")
    button(page, "Giao diện").click()
    button(page, "Sáng").click()

    nav(page, "Cài đặt")
    button(page, "Bản sao lưu").click()
    with page.expect_download() as download:
        button(page, "Xuất bản sao lưu").click()
    backup_path = OUTPUT.parent / f"{engine}-backup.json"
    download.value.save_as(str(backup_path))
    backup = json.loads(backup_path.read_text(encoding="utf-8"))
    assert backup["trips"][0]["title"] == title
    assert [expense["amount"] for expense in backup["trips"][0]["expenses"]] == [450000, 250000]
    button(page, "Xóa dữ liệu").click()
    confirm(page, "Quay lại")
    page.get_by_label("Nhập bản sao lưu", exact=True).set_input_files(
        {"name": "bad.json", "mimeType": "application/json", "buffer": b"{"}
    )
    expect(page.get_by_text("Tệp này không phải JSON hợp lệ.", exact=True)).to_be_visible()
    button(page, "Xóa dữ liệu").click()
    confirm(page, "Xóa dữ liệu")
    nav(page, "Nhật ký")
    expect(page.get_by_text("Chưa có chuyến đi nào.", exact=True)).to_be_visible()
    nav(page, "Cài đặt")
    button(page, "Bản sao lưu").click()
    page.get_by_label("Nhập bản sao lưu", exact=True).set_input_files(str(backup_path))
    expect(page.get_by_role("alertdialog")).to_be_visible()
    confirm(page, "Nhập bản sao lưu")
    nav(page, "Nhật ký")
    expect(page.get_by_text("Chào An!", exact=True)).to_be_visible()
    page.set_viewport_size({"width": 320, "height": 740})
    audit(page, f"{engine} home 320")
    nav(page, "Cài đặt")
    audit(page, f"{engine} settings 320")
    button(page, "Tài khoản & đồng bộ").click()
    expect(page.get_by_text(ACCOUNT_NOTICE[DATA_PROVIDER], exact=False)).to_be_visible()
    expect(button(page, "Đăng nhập với Google")).to_have_count(0)
    expect(button(page, "Đồng bộ ngay")).to_have_count(0)
    audit(page, f"{engine} account 320")
    page.screenshot(path=str(OUTPUT / f"{engine}-account-320.png"), full_page=True)

    nav(page, "Chuyến đi")
    open_trip(page, title)
    button(page, "Chỉnh sửa").click()
    page.get_by_label("Tên chuyến đi").fill("Nháp tab cũ")
    other = context.new_page()
    other.on("pageerror", lambda error: errors.append(str(error)))
    other.goto(URL)
    other.wait_for_load_state("networkidle")
    nav(other, "Chuyến đi")
    open_trip(other, title)
    button(other, "Chỉnh sửa").click()
    updated_title = "Đà Lạt từ tab khác"
    other.get_by_label("Tên chuyến đi").fill(updated_title)
    button(other, "Lưu chuyến đi").click()
    expect(other.get_by_role("heading", name=updated_title, exact=True)).to_be_visible()
    button(page, "Lưu chuyến đi").click()
    expect(page.get_by_text("thay đổi ở cửa sổ khác", exact=False)).to_be_visible()
    expect(page.get_by_label("Tên chuyến đi")).to_have_value("Nháp tab cũ")
    nav(page, "Chuyến đi")
    confirm(page, "Bỏ thay đổi")
    open_trip(page, updated_title)
    button(page, "Chỉnh sửa").click()
    draft_note = "Ghi chú còn trong nháp"
    note = page.get_by_label("Ghi chú", exact=True)
    amount = page.get_by_label("Số tiền (VND)").first
    note.fill(draft_note)
    amount.fill("490000")
    storage_key = other.evaluate(
        "() => Object.keys(localStorage).find(key => key.endsWith(':trips-v1:guest'))"
    )
    assert storage_key
    raw = other.evaluate("(key) => localStorage.getItem(key)", storage_key)
    assert json.loads(raw)["snapshot"]["trips"][0]["title"] == updated_title
    corrupt_raw = '{"snapshot":'
    other.evaluate("([key, value]) => localStorage.setItem(key, value)", [storage_key, corrupt_raw])
    corrupt_notice = page.get_by_text("Không đọc được dữ liệu trên thiết bị.", exact=False)
    expect(corrupt_notice).to_be_visible()
    expect(note).to_have_value(draft_note)
    expect(amount).to_have_value("490000")
    button(page, "Lưu chuyến đi").click()
    expect(page.get_by_text("Chưa lưu được chuyến đi.", exact=False)).to_be_visible()
    expect(note).to_have_value(draft_note)
    expect(amount).to_have_value("490000")
    assert page.evaluate("(key) => localStorage.getItem(key)", storage_key) == corrupt_raw
    other.evaluate("([key, value]) => localStorage.setItem(key, value)", [storage_key, raw])
    expect(corrupt_notice).to_have_count(0)
    nav(page, "Chuyến đi")
    confirm(page, "Bỏ thay đổi")
    other.close()
    open_trip(page, updated_title)
    expect(page.get_by_text("Đi dạo quanh hồ", exact=False)).to_be_visible()
    expect(page.locator(".journey-expense").filter(has_text="Vé máy bay")).to_contain_text("450.000")
    button(page, "Xóa chuyến đi").click()
    confirm(page, "Quay lại")
    expect(page.get_by_role("heading", name=updated_title, exact=True)).to_be_visible()
    button(page, "Xóa chuyến đi").click()
    confirm(page, "Xóa chuyến đi")
    expect(page.get_by_text("Chưa có chuyến đi nào.", exact=True)).to_be_visible()

    nav(page, "Nhật ký")
    page.set_viewport_size({"width": 1280, "height": 900})
    assert page.locator(".app-frame").bounding_box()["width"] == 480
    page.screenshot(path=str(OUTPUT / f"{engine}-desktop.png"), full_page=True)
    manifest = page.evaluate("async () => await (await fetch(document.querySelector('link[rel=manifest]').href)).json()")
    assert manifest["scope"] == manifest["start_url"] == app_url.path
    assert manifest["display"] == "standalone"
    for icon in manifest["icons"]:
        assert page.request.get(urljoin(URL, icon["src"])).ok

    if engine == "chromium":
        page.wait_for_function("Boolean(navigator.serviceWorker?.controller)")
        context.set_offline(True)
        page.reload()
        expect(page.get_by_text("Chào An!", exact=True)).to_be_visible()
        button(page, "Chuyến đi mới").click()
        page.get_by_label("Tên chuyến đi").fill("Chuyến đi khi mất mạng")
        button(page, "Lưu chuyến đi").click()
        expect(page.get_by_role("heading", name="Chuyến đi khi mất mạng", exact=True)).to_be_visible()
        page.reload()
        nav(page, "Chuyến đi")
        open_trip(page, "Chuyến đi khi mất mạng")
        context.set_offline(False)
        cached = page.evaluate("async () => (await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r=>r.url)))).flat()")
        assert all(urlsplit(url).netloc == app_url.netloc for url in cached)
    assert not errors, f"Browser runtime errors: {errors}"
    assert not external_requests, f"Unexpected external requests: {external_requests}"
    context.close()
    print(f"PASS {engine}: trips, drafts, expenses, filters, theme, backup, stale tabs, corrupt storage, a11y, responsive, manifest" + (", offline PWA" if engine == "chromium" else ""), flush=True)

with sync_playwright() as p:
    for engine in ["chromium", "webkit"]:
        browser = getattr(p, engine).launch(headless=True)
        try:
            run(browser, engine)
        finally:
            browser.close()
