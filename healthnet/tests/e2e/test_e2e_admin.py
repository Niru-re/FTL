import pytest
from playwright.sync_api import sync_playwright
from tests.utils.browser_helpers import BrowserErrorTracker

FRONTEND_URL = "http://127.0.0.1:5173"

def login_as_admin(page):
    page.goto(f"{FRONTEND_URL}/login")
    page.fill("input[type='email']", "admin@healthnet.demo")
    page.fill("input[type='password']", "admin123")
    page.click("button[type='submit']")
    page.wait_for_url("**/admin**", timeout=10000)

def test_admin_dashboard_render():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        tracker = BrowserErrorTracker()
        tracker.attach(page)

        login_as_admin(page)

        # Verify key sections on admin command center
        page.wait_for_selector("text=SYSTEM ONLINE", timeout=10000)
        page.wait_for_selector("text=Network Health", timeout=10000)
        page.wait_for_selector("text=Total Hospitals", timeout=10000)
        page.wait_for_selector("text=Total Beds", timeout=10000)

        # Verify zero unhandled exceptions
        summary = tracker.get_summary()
        assert summary["page_errors"] == 0, f"Page crashes: {summary['exceptions_detail']}"

        browser.close()

def test_admin_icu_network_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_admin(page)

        page.goto(f"{FRONTEND_URL}/admin/icu")
        page.wait_for_selector("text=ICU Network & Bed Allocation Center", timeout=10000)
        page.wait_for_selector("text=METROPOLITAN ICU BED SEGMENTATION", timeout=10000)

        browser.close()

def test_admin_reports_and_csv_export():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_admin(page)

        page.goto(f"{FRONTEND_URL}/admin/reports")
        page.wait_for_selector("text=Executive Reports & Utilization Center", timeout=10000)
        page.wait_for_selector("text=Export CSV Report", timeout=10000)
        page.wait_for_selector("text=Export CSV Report", timeout=10000)

        # Test download
        with page.expect_download() as download_info:
            page.click("text=Export CSV Report")
        download = download_info.value
        assert download.suggested_filename.endswith(".csv")

        browser.close()

def test_admin_simulation_center():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_admin(page)

        page.goto(f"{FRONTEND_URL}/admin/simulation")
        page.wait_for_selector("text=Real-Time Simulation Control Center", timeout=10000)
        page.wait_for_selector("text=Reset Demo State", timeout=10000)

        browser.close()
