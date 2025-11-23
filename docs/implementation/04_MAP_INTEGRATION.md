# Section 04: Map & GPX Integration

## Goal
Display a dynamic map that moves in sync with the video playback, showing the current location on the GPX track.

## Components
- **GPX Overlay**: A specialized implementation of the Overlay system.
- **Map Provider**: `react-leaflet`.

## Logic

### 1. Time-to-Coordinate Mapping
We need a fast lookup mechanism.
- **Pre-processing**: When loading a GPX, flatten it into an array of `{ time: number, lat: number, lon: number }`.
- **Runtime**: Given `currentTime` (video time), calculate `gpxTime`.
  - `gpxTime = (currentTime - clip.start) + syncOffset`.
- **Interpolation**: Find the two points surrounding `gpxTime` and lerp (linear interpolate) the coordinate.

### 2. Sync Offset (Alignment)
- **Auto**: `offset = video.creationTime - gpx.startTime`.
- **Manual**: User selects a frame in video and a point on map. `offset = gpxPointTime - videoFrameTime`.

### 3. Visuals
- **Track Line**: Polyline of the entire route.
- **Current Marker**: A distinct marker updating position every frame.

## Tasks
1.  [x] **GPX Util**: Enhance `gpxParser` to support efficient lookups.
2.  [x] **Map Component**: Leaflet wrapper that accepts `center` and `zoom`.
3.  [x] **Sync UI**: Interface for setting the "Manual Sync" offset.

## Testing
- **Unit**: Test `getCoordinateAtTime(gpx, time)` with edge cases (start/end of track).
- **Unit**: Test interpolation logic.
- **Integration**: Verify map updates with time and sync offset.
