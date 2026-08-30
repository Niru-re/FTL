import pytest
from playwright.sync_api import sync_playwright
import requests

FRONTEND_URL = "http://127.0.0.1:5173"
BASE_URL = "http://127.0.0.1:8000"

def test_emergency_intake_modal_and_routing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Login as Admin
        page.goto(f"{FRONTEND_URL}/login")
        page.fill("input[type='email']", "admin@healthnet.demo")
        page.fill("input[type='password']", "admin123")
        page.click("button[type='submit']")
        page.wait_for_url("**/admin**", timeout=10000)

        # Open Emergency Intake Modal via Navbar button
        page.wait_for_selector("button:has-text('Emergency Intake')", timeout=8000)
        page.click("button:has-text('Emergency Intake')")

        # Verify modal opened
        page.wait_for_selector("text=Emergency Intake & Intelligent Resource Routing", timeout=5000)

        # Close modal
        page.keyboard.press("Escape")
        browser.close()
