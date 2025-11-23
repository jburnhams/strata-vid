
from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to app
        # Vite usually runs on 5173
        page.goto("http://localhost:3000")

        # Wait for app to load (checking for a key element)
        page.wait_for_selector('text=Strata Vid')

        print("App loaded")

        # 1. Verify basic layout
        # Check for Timeline
        if page.is_visible('.dnd-kit-sortable-overlay'):
             print("DND overlay found (not expected yet, but checking selectors)")

        # Take a screenshot of the initial state
        page.screenshot(path="verification/1_initial_state.png")
        print("Screenshot 1 taken")

        # 2. Simulate Export Modal Open
        # We need to find the export button. Based on layout, it's likely in the header.
        # Searching for "Export" text.
        try:
            export_btn = page.get_by_role('button', name='Export')
            if export_btn.is_visible():
                export_btn.click()
                print("Clicked Export")

                # Wait for modal
                page.wait_for_selector('text=Exporting Project')
                print("Export modal appeared")

                # Wait a bit for simulated progress
                time.sleep(1)

                page.screenshot(path="verification/2_export_modal.png")
                print("Screenshot 2 taken")

                # Close it
                page.get_by_role('button', name='Cancel').click()
            else:
                print("Export button not visible")
        except Exception as e:
            print(f"Export interaction failed: {e}")

        browser.close()

if __name__ == "__main__":
    run_verification()
