from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            print("Navigating...")
            page.goto("http://localhost:3000")

            # Wait for app to load
            print("Waiting for title...")
            page.wait_for_selector("text=Strata Vid")

            # Wait for Transport Controls
            print("Waiting for Transport Controls...")
            page.wait_for_selector('button[title="Play (Space)"]')

            # Click Play
            print("Clicking Play...")
            page.click('button[title="Play (Space)"]')

            # Wait a bit
            time.sleep(1)

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/playback_controls.png")
            print("Screenshot saved to verification/playback_controls.png")

        except Exception as e:
            print(f"Error: {e}")
            # Take error screenshot
            try:
                page.screenshot(path="verification/error.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    run()
