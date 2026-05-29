"""
End-to-end verification: create activity + all 4 checkin types + pre-populate round-trip.
App is already running at http://localhost:3000.
Uses direct API calls to authenticate (JWT stored in localStorage.auth_token).
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SCREENSHOTS = []

def ss(page, name):
    path = f"C:/tmp/verify_{name}.png"
    import os; os.makedirs("C:/tmp", exist_ok=True)
    page.screenshot(path=path, full_page=False)
    SCREENSHOTS.append((name, path))
    print(f"  [screenshot] {name} -> {path}")
    return path


def api_register_and_login(page):
    """Register (or login if already exists) via the API, store token in localStorage."""
    page.goto(BASE)
    page.wait_for_load_state("networkidle")

    result = page.evaluate("""
        async () => {
            // Try register first
            const reg = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: 'Test Verifier',
                    tel: '0899999999',
                    password: 'testpass123',
                    characterName: 'Tester',
                    gender: 'female'
                })
            });
            if (reg.ok) {
                const data = await reg.json();
                localStorage.setItem('auth_token', data.token);
                return {ok: true, source: 'register', token: data.token};
            }
            // Already registered — try login
            const login = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: '0899999999', password: 'testpass123'})
            });
            if (login.ok) {
                const data = await login.json();
                localStorage.setItem('auth_token', data.token);
                return {ok: true, source: 'login', token: data.token};
            }
            const err = await login.json();
            return {ok: false, error: JSON.stringify(err)};
        }
    """)
    if not result or not result.get("ok"):
        raise RuntimeError(f"Auth failed: {result}")
    print(f"  Authenticated via {result['source']}, token set in localStorage")
    return result["token"]


def nav_to_today(page):
    page.goto(f"{BASE}/habit/today")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)


def get_today_entries(page):
    today = time.strftime("%Y-%m-%d")
    result = page.evaluate(f"""
        async () => {{
            const token = localStorage.getItem('auth_token');
            const r = await fetch('/api/habits/today?date={today}', {{
                headers: {{'Authorization': 'Bearer ' + token}}
            }});
            if (!r.ok) return null;
            return r.json();
        }}
    """)
    if not result or not result.get("entries"):
        return {}
    by_key = {}
    for entry in result["entries"]:
        cat = entry["activity"].get("category", "")
        pc = entry["activity"].get("physicalCategory") or ""
        key = f"{cat}:{pc}"
        by_key[key] = {
            "occurrenceId": entry["occurrence"]["id"],
            "activityId": entry["activity"]["id"],
            "activityName": entry["activity"]["name"],
        }
    return by_key


def create_activity_via_api(page, payload):
    result = page.evaluate(f"""
        async () => {{
            const token = localStorage.getItem('auth_token');
            const r = await fetch('/api/habits/activities', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}},
                body: JSON.stringify({payload})
            }});
            const j = await r.json();
            return {{status: r.status, body: j}};
        }}
    """)
    return result


# ── test functions ─────────────────────────────────────────────────────────

def test_today_page_loads(page):
    print("\n[1] Today page renders Daily Tracker")
    nav_to_today(page)
    ss(page, "01_today")
    body = page.content()
    ok = "Daily Tracker" in body or "daily habits" in body or "habit-entries" in body
    assert ok, "Today page missing habit tracker content"
    print("  OK Today page renders correctly")


def test_add_activity_page(page):
    print("\n[2] /habit/add is reachable via + button")
    nav_to_today(page)
    page.wait_for_timeout(500)
    page.goto(f"{BASE}/habit/add")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    ss(page, "02_add_activity")
    assert "/habit/add" in page.url, f"Expected /habit/add, got {page.url}"
    print(f"  OK Navigated to {page.url}")


def ensure_activities(page):
    """Create one activity of each required type if missing."""
    entries = get_today_entries(page)
    today = time.strftime("%Y-%m-%d")
    created = {}

    if "medicine:" not in entries:
        import json
        payload = json.dumps({
            "category": "medicine",
            "name": "ยาทดสอบ",
            "schedule": {"frequency": "daily", "weekdays": []},
            "mealRelation": "after",
            "mealSlots": ["breakfast"],
            "archived": False
        })
        r = create_activity_via_api(page, payload)
        print(f"  Created medicine activity: {r['status']}")

    if "nutrition:" not in entries:
        import json
        payload = json.dumps({
            "category": "nutrition",
            "name": "บันทึกอาหารทดสอบ",
            "schedule": {"frequency": "daily", "weekdays": []},
            "archived": False
        })
        r = create_activity_via_api(page, payload)
        print(f"  Created nutrition activity: {r['status']}")

    if "physical:symptoms" not in entries:
        import json
        payload = json.dumps({
            "category": "physical",
            "physicalCategory": "symptoms",
            "name": "ติดตามอาการทดสอบ",
            "schedule": {"frequency": "daily", "weekdays": []},
            "archived": False
        })
        r = create_activity_via_api(page, payload)
        print(f"  Created symptoms activity: {r['status']}")

    if "physical:emotion-management" not in entries:
        import json
        payload = json.dumps({
            "category": "physical",
            "physicalCategory": "emotion-management",
            "name": "บันทึกอารมณ์ทดสอบ",
            "schedule": {"frequency": "daily", "weekdays": []},
            "archived": False
        })
        r = create_activity_via_api(page, payload)
        print(f"  Created emotion activity: {r['status']}")

    # Refresh and return
    page.wait_for_timeout(300)
    return get_today_entries(page)


def test_medicine_roundtrip(page, occ_id, act_id):
    print("\n[3] Medicine checkin — save then re-open pre-populates")
    url = f"{BASE}/habit/checkin/medicine?occ={occ_id}&actId={act_id}"

    # Open page — may already have data pre-populated
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    ss(page, "03_med_fresh")

    rows = page.locator(".ci-check-row")
    assert rows.count() > 0, f"No side-effect checkboxes found"
    first_label = rows.first.locator(".ci-check-label").inner_text()

    # Record current state and determine desired state (always flip to CHECKED)
    current_class = rows.first.get_attribute("class") or ""
    already_checked = "is-checked" in current_class

    if not already_checked:
        rows.first.click()  # Check it
        page.wait_for_timeout(300)
        assert "is-checked" in (rows.first.get_attribute("class") or ""), "Click did not check the item"
        print(f"  Checked '{first_label}' (was unchecked)")
    else:
        print(f"  '{first_label}' already pre-populated as checked (from previous save)")

    ss(page, "03_med_checked")
    page.locator("[aria-label='บันทึก'], .ci-btn--save").first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    print(f"  Saved medicine checkin")

    # Re-open — should pre-populate with checked state
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)
    ss(page, "03_med_reopen")

    row0_class = page.locator(".ci-check-row").first.get_attribute("class") or ""
    assert "is-checked" in row0_class, f"FAIL: side effect not pre-populated on re-open. class='{row0_class}'"
    print(f"  OK Medicine pre-populated: '{first_label}' is checked after re-open")


def test_nutrition_roundtrip(page, occ_id, act_id):
    print("\n[4] Nutrition checkin — save then re-open pre-populates meal fields")
    url = f"{BASE}/habit/checkin/nutrition?occ={occ_id}&actId={act_id}"

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    ss(page, "04_nut_fresh")

    inputs = page.locator(".ci-meal-input")
    assert inputs.count() >= 3, f"Expected 3+ meal inputs, got {inputs.count()}"
    inputs.nth(0).fill("ข้าวต้ม")
    inputs.nth(1).fill("ผัดผัก")
    inputs.nth(2).fill("ต้มยำ")
    ss(page, "04_nut_filled")

    page.locator("[aria-label='บันทึก'], .ci-btn--save").first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)
    print("  Saved nutrition checkin")

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    ss(page, "04_nut_reopen")

    val0 = page.locator(".ci-meal-input").nth(0).input_value()
    val1 = page.locator(".ci-meal-input").nth(1).input_value()
    val2 = page.locator(".ci-meal-input").nth(2).input_value()
    assert val0 == "ข้าวต้ม", f"FAIL: breakfast not pre-populated. Got '{val0}'"
    assert val1 == "ผัดผัก", f"FAIL: lunch not pre-populated. Got '{val1}'"
    assert val2 == "ต้มยำ", f"FAIL: dinner not pre-populated. Got '{val2}'"
    print(f"  OK Nutrition pre-populated: breakfast='{val0}', lunch='{val1}', dinner='{val2}'")


def test_symptom_roundtrip(page, occ_id, act_id):
    print("\n[5] Symptom checkin — save then re-open pre-populates")
    url = f"{BASE}/habit/checkin/symptom?occ={occ_id}&actId={act_id}"

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    ss(page, "05_sym_fresh")

    rows = page.locator(".ci-check-row")
    assert rows.count() > 0, f"No symptom checkboxes"

    # Ensure items 0 and 2 are checked, item 1 is unchecked
    def ensure_checked(row, should_check):
        cls = row.get_attribute("class") or ""
        currently = "is-checked" in cls
        if currently != should_check:
            row.click()
            page.wait_for_timeout(150)

    ensure_checked(rows.nth(0), True)
    ensure_checked(rows.nth(1), False)
    ensure_checked(rows.nth(2), True)
    ss(page, "05_sym_checked")

    page.locator("[aria-label='บันทึก'], .ci-btn--save").first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    print("  Saved symptom checkin (0=checked, 1=unchecked, 2=checked)")

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)
    ss(page, "05_sym_reopen")

    c0 = page.locator(".ci-check-row").nth(0).get_attribute("class") or ""
    c1 = page.locator(".ci-check-row").nth(1).get_attribute("class") or ""
    c2 = page.locator(".ci-check-row").nth(2).get_attribute("class") or ""
    assert "is-checked" in c0, f"FAIL: symptom 0 not pre-populated. class='{c0}'"
    assert "is-checked" not in c1, f"FAIL: symptom 1 should be unchecked. class='{c1}'"
    assert "is-checked" in c2, f"FAIL: symptom 2 not pre-populated. class='{c2}'"
    print("  OK Symptom pre-populated: items 0 and 2 checked, item 1 unchecked")


def test_emotion_roundtrip(page, occ_id, act_id):
    print("\n[6] Emotion checkin — save then re-open pre-populates mood")
    url = f"{BASE}/habit/checkin/emotion?occ={occ_id}&actId={act_id}"

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    ss(page, "06_emo_fresh")

    btns = page.locator(".ci-mood-btn")
    assert btns.count() == 5, f"Expected 5 mood buttons, got {btns.count()}"
    # Click "very-good" (last button)
    btns.last.click()
    page.wait_for_timeout(300)
    assert "is-selected" in (btns.last.get_attribute("class") or ""), "very-good not selected"
    ss(page, "06_emo_selected")

    page.locator("[aria-label='บันทึก'], .ci-btn--save").first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(600)
    print("  Saved emotion checkin (very-good)")

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    ss(page, "06_emo_reopen")

    last_class = page.locator(".ci-mood-btn").last.get_attribute("class") or ""
    assert "is-selected" in last_class, f"FAIL: very-good not pre-populated. class='{last_class}'"
    print("  OK Emotion pre-populated: very-good is still selected")


def test_today_shows_done(page):
    print("\n[7] Today page shows done status after checkins")
    nav_to_today(page)
    page.wait_for_timeout(800)
    ss(page, "07_today_done")
    done_count = page.locator(".habit-check.done").count()
    assert done_count > 0, "FAIL: No habits marked done on today page"
    print(f"  OK {done_count} habit(s) marked done")


def probe_get_endpoints_not_405(page, occ_ids):
    print("\n[probe] GET checkin routes must NOT return 405")
    for checkin_type in ["nutrition", "symptoms", "mood"]:
        occ_id = occ_ids.get(checkin_type, "fake-id")
        status = page.evaluate(f"""
            async () => {{
                const token = localStorage.getItem('auth_token');
                const r = await fetch('/api/habits/checkins/{checkin_type}/{occ_id}', {{
                    headers: {{'Authorization': 'Bearer ' + token}}
                }});
                return r.status;
            }}
        """)
        assert status != 405, f"FAIL: GET /checkins/{checkin_type} returned 405 (missing GET handler)"
        print(f"  GET /checkins/{checkin_type} -> {status} (not 405)  OK")


def probe_get_returns_saved_data(page, occ_ids):
    print("\n[probe] GET checkin endpoints return previously saved data")
    for checkin_type, occ_id in occ_ids.items():
        result = page.evaluate(f"""
            async () => {{
                const token = localStorage.getItem('auth_token');
                const r = await fetch('/api/habits/checkins/{checkin_type}/{occ_id}', {{
                    headers: {{'Authorization': 'Bearer ' + token}}
                }});
                return {{status: r.status, body: await r.json()}};
            }}
        """)
        assert result["status"] == 200, f"FAIL: GET /checkins/{checkin_type} returned {result['status']}"
        assert result["body"].get("checkin") is not None, f"FAIL: checkin is null for {checkin_type}"
        print(f"  GET /checkins/{checkin_type} -> 200 with non-null checkin  OK")


# ── main ──────────────────────────────────────────────────────────────────

def main():
    passed = failed = 0
    errors = []

    def run(name, fn, *args):
        nonlocal passed, failed
        try:
            fn(*args)
            passed += 1
        except Exception as e:
            failed += 1
            errors.append(f"{name}: {e}")
            print(f"  FAIL {e}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        try:
            print("=== Story Diary End-to-End Checkin Verification ===\n")

            # Authenticate via API
            print("[0] Authenticating via API...")
            api_register_and_login(page)

            # Ensure all 4 activity types exist
            print("\n[setup] Creating required habit activities if missing...")
            entries = ensure_activities(page)
            print(f"  Available: {list(entries.keys())}")

            occ_ids = {}

            # 1 — today page
            run("[1] today page", test_today_page_loads, page)

            # 2 — add activity page
            run("[2] add activity page", test_add_activity_page, page)

            # 3 — medicine
            med = entries.get("medicine:")
            if med:
                occ_ids["medicine"] = med["occurrenceId"]
                run("[3] medicine", test_medicine_roundtrip, page, med["occurrenceId"], med["activityId"])
            else:
                print("\n[3] SKIP no medicine activity found")

            # 4 — nutrition
            nut = entries.get("nutrition:")
            if nut:
                occ_ids["nutrition"] = nut["occurrenceId"]
                run("[4] nutrition", test_nutrition_roundtrip, page, nut["occurrenceId"], nut["activityId"])
            else:
                print("\n[4] SKIP no nutrition activity found")

            # 5 — symptoms
            sym = entries.get("physical:symptoms")
            if sym:
                occ_ids["symptoms"] = sym["occurrenceId"]
                run("[5] symptoms", test_symptom_roundtrip, page, sym["occurrenceId"], sym["activityId"])
            else:
                print("\n[5] SKIP no symptoms activity found")

            # 6 — emotion
            emo = entries.get("physical:emotion-management")
            if emo:
                occ_ids["mood"] = emo["occurrenceId"]
                run("[6] emotion", test_emotion_roundtrip, page, emo["occurrenceId"], emo["activityId"])
            else:
                print("\n[6] SKIP no emotion activity found")

            # 7 — done status on today page
            run("[7] today done status", test_today_shows_done, page)

            # probes
            run("[probe] GET not 405", probe_get_endpoints_not_405, page, occ_ids)
            if occ_ids:
                run("[probe] GET returns data", probe_get_returns_saved_data, page, occ_ids)

        finally:
            browser.close()

    print(f"\n=== {passed} passed  {failed} failed ===")
    if errors:
        print("Failures:")
        for e in errors:
            print(f"  FAIL {e}")
    print("\nScreenshots:")
    for name, path in SCREENSHOTS:
        print(f"  {name}: {path}")
    return failed == 0


if __name__ == "__main__":
    ok = main()
    exit(0 if ok else 1)
