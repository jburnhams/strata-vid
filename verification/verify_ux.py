import os
import time
from playwright.sync_api import sync_playwright

def verify_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:3000")

        # Wait for app to load
        page.wait_for_selector("text=Strata Vid")

        # 1. Verify Tooltips
        # Hover over Export button
        export_btn = page.get_by_role("button", name="Export")
        export_btn.hover()

        # Wait for tooltip
        page.wait_for_selector("text=Export project to MP4")

        # Take screenshot of tooltip
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/tooltip.png")
        print("Tooltip screenshot taken")

        # 2. Verify Metadata Panel
        # Check for empty state text
        page.wait_for_selector("text=Select an asset to view details")

        # 3. Verify Library Panel Add Button
        # Find label containing + Add
        add_label = page.locator("label", has_text="+ Add")
        add_label.hover()
        page.wait_for_selector("text=Add video or GPX files")

        page.screenshot(path="/home/jules/verification/library_tooltip.png")
        print("Library tooltip screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_ux()
