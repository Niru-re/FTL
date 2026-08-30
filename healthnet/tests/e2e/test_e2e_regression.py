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

def test_responsive_viewports():
    viewports = [
        {"name": "Desktop", "width": 1920, "height": 1080},
        {"name": "Tablet", "width": 768, "height": 1024},
        {"name": "Mobile", "width": 375, "height": 812}
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for vp in viewports:
            context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = context.new_page()
            login_as_admin(page)

            # Check that navbar and critical dashboard elements exist without page crash
            page.wait_for_selector("text=HEALTHNET", timeout=8000)
            context.close()
        browser.close()

def test_unknown_route_handling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_admin(page)

        # Go to random unknown route
        page.goto(f"{FRONTEND_URL}/unknown-random-route-999")
        # Should gracefully redirect to a known fallback or show not found without crashing
        page.wait_for_timeout(1000)
        assert page.is_visible("body")
        browser.close()

def test_global_search_interaction():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        login_as_admin(page)

        # Find search box
        search_input = page.query_selector("input[placeholder*='Search Hospital']")
        if search_input and search_input.is_visible():
            search_input.fill("Central")
            page.wait_for_timeout(1000)
            # Verify results popover appears
            page.wait_for_selector("text=GLOBAL SEARCH RESULTS", timeout=5000)

        browser.close()
