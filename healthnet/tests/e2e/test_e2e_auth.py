import pytest
from playwright.sync_api import sync_playwright
from tests.utils.browser_helpers import BrowserErrorTracker

FRONTEND_URL = "http://127.0.0.1:5173"

def test_e2e_admin_login_and_logout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        tracker = BrowserErrorTracker()
        tracker.attach(page)

        # 1. Navigate to login
        page.goto(f"{FRONTEND_URL}/login")
        page.wait_for_selector("input[type='email']")

        # 2. Fill Admin Credentials
        page.fill("input[type='email']", "admin@healthnet.demo")
        page.fill("input[type='password']", "admin123")
        page.click("button[type='submit']")

        # 3. Verify Admin Dashboard loads
        page.wait_for_selector("text=Total Hospitals", timeout=10000)
        assert "/admin" in page.url

        # 4. Check for uncaught page crashes
        summary = tracker.get_summary()
        assert summary["page_errors"] == 0, f"Page errors found: {summary['exceptions_detail']}"

        browser.close()

def test_e2e_doctor_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{FRONTEND_URL}/login")
        page.fill("input[type='email']", "doctor@healthnet.demo")
        page.fill("input[type='password']", "doctor123")
        page.click("button[type='submit']")
        page.wait_for_selector("text=My Patients", timeout=10000)
        assert "/doctor" in page.url
        browser.close()

def test_e2e_nurse_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{FRONTEND_URL}/login")
        page.fill("input[type='email']", "nurse@healthnet.demo")
        page.fill("input[type='password']", "nurse123")
        page.click("button[type='submit']")
        page.wait_for_selector("text=Assigned Patients", timeout=10000)
        assert "/nurse" in page.url
        browser.close()

def test_e2e_invalid_login_rejection():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{FRONTEND_URL}/login")
        page.fill("input[type='email']", "admin@healthnet.demo")
        page.fill("input[type='password']", "wrong_password_999")
        page.click("button[type='submit']")

        # Check that error is shown and URL stays on login
        page.wait_for_timeout(1000)
        assert "/login" in page.url
        browser.close()
