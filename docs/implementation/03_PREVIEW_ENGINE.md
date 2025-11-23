# Section 03: Preview Engine

## Goal
The "Player" that renders the project state in real-time for the user.

## Architecture
Instead of rendering a single canvas, we will use a **Composite DOM** approach for the preview to ensure high performance and accessibility.

### Layer Stack
1.  **Background**: Black container.
2.  **Video Layer**: `<video>` element(s).
    - *Optimization*: Only render the video clip that is currently active at `currentTime`.
    - If multiple video tracks exist, use CSS `mix-blend-mode` or multiple video tags (browser limit warning).
3.  **Overlay Layer**: A `div` container with `position: relative`.
    - **Child Elements**: Render Text, Images, and Maps as absolute positioned `divs` based on their `properties`.

## Synchronization (`usePlaybackLoop`)
- A custom hook that runs `requestAnimationFrame`.
- **Logic**:
  1.  Check `store.isPlaying`.
  2.  Update `store.currentTime += delta`.
  3.  **Seek**: If `currentTime` crosses a clip boundary, ensure the underlying `<video>` element seeks to the correct offset (`currentTime - clip.start + clip.offset`).

## Tasks
1.  [x] **VideoPlayer Component**: Wrapper around HTML5 Video.
2.  [x] **OverlayRenderer**: Component that maps `activeClips` to React components.
3.  [x] **Playback Hook**: Implement the master clock and transport controls (Play/Pause/Stop).
4.  [x] **Sync Logic**: Ensure video stays in sync with the timer (handle drift).

## Testing
- **Unit**: Test the `activeClips` selector (given time `T`, returns correct clips).
- **Manual**: Verify A/V sync visually.
