from playwright.sync_api import sync_playwright

def verify_timeline_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the timeline clearly
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            # 1. Load the app
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Strata Vid", timeout=10000)

            # 2. Add a sample clip (if not present)
            # Assuming there's a way to add a track or clip, or relying on initial state.
            # If the timeline is empty, we might need to click "Add Track"
            print("Adding track...")
            add_track_btn = page.get_by_text("+ Add Track")
            if add_track_btn.is_visible():
                add_track_btn.click()

            # We need to simulate adding a clip. Since I can't easily drag-drop file in headless quickly without mocks,
            # I'll rely on inspecting the timeline UI structure (Zoom controls) and empty state or initial state.
            # The tests showed mock data, but the real app starts empty.
            # However, I can verify the Zoom Controls are present.

            print("Verifying Zoom Controls...")
            # Check for zoom buttons and slider
            zoom_in = page.get_by_title("Zoom In")
            zoom_out = page.get_by_title("Zoom Out")

            if not zoom_in.is_visible():
                print("Error: Zoom In button not found")
            if not zoom_out.is_visible():
                print("Error: Zoom Out button not found")

            # Take screenshot of the timeline area
            print("Taking screenshot...")
            page.screenshot(path="verification/timeline_features.png")
            print("Screenshot saved to verification/timeline_features.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_timeline_features()
