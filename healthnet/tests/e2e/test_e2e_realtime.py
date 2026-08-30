import pytest
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173"

def test_cross_role_realtime_synchronization():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Context 1: Admin
        admin_context = browser.new_context()
        admin_page = admin_context.new_page()
        admin_page.goto(f"{FRONTEND_URL}/login")
        admin_page.fill("input[type='email']", "admin@healthnet.demo")
        admin_page.fill("input[type='password']", "admin123")
        admin_page.click("button[type='submit']")
        admin_page.wait_for_url("**/admin**", timeout=10000)

        # Context 2: Nurse
        nurse_context = browser.new_context()
        nurse_page = nurse_context.new_page()
        nurse_page.goto(f"{FRONTEND_URL}/login")
        nurse_page.fill("input[type='email']", "nurse@healthnet.demo")
        nurse_page.fill("input[type='password']", "nurse123")
        nurse_page.click("button[type='submit']")
        nurse_page.wait_for_url("**/nurse**", timeout=10000)

        # Both contexts should be online and authenticated
        admin_page.wait_for_selector("text=SYSTEM ONLINE", timeout=8000)
        nurse_page.wait_for_selector("text=SYSTEM ONLINE", timeout=8000)

        admin_context.close()
        nurse_context.close()
        browser.close()
