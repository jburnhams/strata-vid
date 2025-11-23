from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_timeline_ui(page: Page):
    # Navigate to the app
    page.goto("http://localhost:3000")

    # Wait for the app to load
    expect(page.get_by_text("Strata Vid")).to_be_visible()

    # Check that the Timeline panel is visible
    expect(page.get_by_text("Zoom:")).to_be_visible()

    # The app starts with no tracks or clips.
    # We need to simulate adding an asset and track to see the UI properly.
    # However, file upload is tricky in headless mode without a real file.
    # But we can check the empty state elements.

    # Check for the "Add Track" button placeholder
    expect(page.get_by_text("+ Add Track")).to_be_visible()

    # Zoom controls interaction
    zoom_label = page.get_by_text("Zoom:")
    zoom_plus = page.get_by_text("+", exact=True)
    zoom_minus = page.get_by_text("-", exact=True)

    # Initial zoom is 10.0
    expect(page.get_by_text("10.0px/s")).to_be_visible()

    # Click +
    zoom_plus.click()
    # Should increase (logic is * 1.1) -> 11.0
    expect(page.get_by_text("11.0px/s")).to_be_visible()

    # Take a screenshot of the timeline area
    # We can locate the timeline panel by a selector or text
    timeline_panel = page.locator(".h-full.w-full.bg-gray-900").last # Assuming it's the timeline one

    # Just take full page screenshot for context
    page.screenshot(path="verification/timeline_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_timeline_ui(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
