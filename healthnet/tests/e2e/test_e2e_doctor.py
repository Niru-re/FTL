import pytest
from playwright.sync_api import sync_playwright
from tests.utils.browser_helpers import BrowserErrorTracker

FRONTEND_URL = "http://127.0.0.1:5173"

def login_as_doctor(page):
    page.goto(f"{FRONTEND_URL}/login")
    page.fill("input[type='email']", "doctor@healthnet.demo")
    page.fill("input[type='password']", "doctor123")
    page.click("button[type='submit']")
    page.wait_for_url("**/doctor**", timeout=10000)

def test_doctor_dashboard_render():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        tracker = BrowserErrorTracker()
        tracker.attach(page)

        login_as_doctor(page)

        # Check doctor dashboard elements
        page.wait_for_selector("text=Welcome,", timeout=10000)
        page.wait_for_selector("text=My Patients", timeout=10000)

        summary = tracker.get_summary()
        assert summary["page_errors"] == 0, f"Doctor page errors: {summary['exceptions_detail']}"
        browser.close()

def test_doctor_patient_monitoring_view():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_doctor(page)

        # Go to patient monitoring view
        page.goto(f"{FRONTEND_URL}/doctor/patients/1")
        page.wait_for_selector("text=Back to Inpatient Census", timeout=10000)
        page.wait_for_selector("text=Bed:", timeout=10000)

        browser.close()
