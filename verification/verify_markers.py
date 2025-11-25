from playwright.sync_api import sync_playwright

def verify_markers(page):
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    print("Waiting for load...")
    page.wait_for_selector("text=Strata Vid")

    print("Clicking Add Marker...")
    # Find button by text "+ Marker"
    page.click("text=+ Marker")

    # Wait for marker to appear
    # Title 'M (0.00s)'
    print("Waiting for marker...")
    marker = page.wait_for_selector("[title='M (0.00s)']")

    # Take screenshot of the timeline area
    print("Taking screenshot...")
    page.screenshot(path="verification/markers.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            verify_markers(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
