from playwright.sync_api import sync_playwright
import os
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Wait for page load
    page.wait_for_selector("text=Strata Vid")

    # Get absolute path to gpx file
    gpx_path = os.path.abspath("verification/test.gpx")

    # Upload file
    # Since input is hidden, we can use set_input_files with 'input[type="file"]'
    page.set_input_files("input[type='file']", gpx_path)

    # Wait for "Test Run" (name from GPX or filename)
    # Asset name is usually filename unless parsed?
    # App.tsx: name: file.name.
    # So it should be "test.gpx".
    page.wait_for_selector("text=test.gpx")

    # Wait a bit for parsing and state update (it's async)
    time.sleep(1)

    # Check Preview
    # Should see leaflet map
    page.wait_for_selector(".leaflet-container")

    # Check Metadata
    page.wait_for_selector("text=GPX Statistics")
    page.wait_for_selector("text=Distance:")

    # Take screenshot
    page.screenshot(path="verification/verification.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
