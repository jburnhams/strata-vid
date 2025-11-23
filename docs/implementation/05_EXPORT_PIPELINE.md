# Section 05: Export Pipeline

## Goal
Render the final video project into a downloadable file (e.g., MP4) entirely in the browser.

## Architecture
- **Library**: `mediabunny` (wraps WebCodecs).
- **Process**: Frame-by-frame rendering.

## The Render Loop
1.  **Initialization**:
    - Create `mediabunny.Output` (configure codec, resolution, fps).
    - Create an `OffscreenCanvas` (the "Compositor").
2.  **Iteration**:
    - Loop from `t = 0` to `duration` in steps of `1/fps`.
    - **Seek**: Update the state of all source videos to time `t`. *Wait* for `seeked` event.
    - **Draw**:
        1.  Clear Canvas.
        2.  Draw active video frame (`ctx.drawImage(videoElement)`).
        3.  Draw overlays:
            - **Text/Images**: Standard Canvas API.
            - **Map**: *Complex*. Requires drawing map tiles and GPX path to the canvas context.
                - *Approach*: Calculate map bounds for time `t`. Fetch/Draw visible tiles. Draw Polyline.
    - **Encode**: Pass the canvas (or `VideoFrame`) to `mediabunny`.
3.  **Finalize**: Close the output and generate the Blob.

## Dependencies
- **Source Media**: All video files must be loaded.
- **Map Tiles**: Exporting maps requires handling tile loading. *Note*: This can be slow and network-intensive.

## Tasks
1.  [x] **Compositor Class**: A service that handles drawing a single frame to a canvas.
2.  [x] **Export Manager**: Handles the loop and `mediabunny` interaction.
3.  [x] **UI**: Progress bar and "Cancel" button.

## Testing
- **Visual**: Generate short 1-second clips and verify output manually.
- **Unit**: Test the "Compositor" by creating a snapshot of the canvas for a specific timeline state.
