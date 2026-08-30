import pytest
from playwright.sync_api import sync_playwright
from tests.utils.browser_helpers import BrowserErrorTracker

FRONTEND_URL = "http://127.0.0.1:5173"

def login_as_nurse(page):
    page.goto(f"{FRONTEND_URL}/login")
    page.fill("input[type='email']", "nurse@healthnet.demo")
    page.fill("input[type='password']", "nurse123")
    page.click("button[type='submit']")
    page.wait_for_url("**/nurse**", timeout=10000)

def test_nurse_dashboard_render():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        tracker = BrowserErrorTracker()
        tracker.attach(page)

        login_as_nurse(page)

        # Verify nurse dashboard components
        page.wait_for_selector("text=Nurse Operations Command", timeout=10000)
        page.wait_for_selector("text=Assigned Patients", timeout=10000)

        summary = tracker.get_summary()
        assert summary["page_errors"] == 0, f"Nurse page errors: {summary['exceptions_detail']}"
        browser.close()

def test_nurse_patient_detail_and_vitals_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_nurse(page)

        # Navigate to first patient
        page.goto(f"{FRONTEND_URL}/nurse/patients/1")
        page.wait_for_selector("text=Request Doctor", timeout=10000)

        # Open Doctor Request Modal
        page.click("text=Request Doctor")
        page.wait_for_selector("textarea", timeout=5000)
        page.fill("textarea", "Routine telemetry review requested.")
        # Close or cancel
        page.keyboard.press("Escape")
        browser.close()
