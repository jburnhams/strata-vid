# Strata Vid

**Browser-based video editor for stitching run videos with GPX data**

Strata Vid is a client-side video editing application that combines multiple video clips with GPS track data to create synchronized, exportable videos. Everything runs in your browser—no server required.

## Status: Early Development 🚧

This project is in active development. Core infrastructure is in place, but many features are not yet functional.

**What works**:
- ✅ Type system and state management (Zustand)
- ✅ Asset loading (videos, GPX files)
- ✅ Component scaffolding (UI layout)
- ✅ Build system (Vite + React 19 + TypeScript)

**What's in progress**:
- 🟨 Video playback and preview
- 🟨 Timeline editing (drag, resize clips)
- 🟨 GPX/map synchronization

**What's planned**:
- ❌ Export to MP4 (scaffolded but untested)
- ❌ Advanced editing (transitions, effects)
- ❌ Audio support
- ❌ Project save/load

## Quick Start

### Prerequisites
- Node.js 20.0.0 or higher
- Modern browser with WebCodecs support (Chrome 94+, Edge 94+)

### Installation

```bash
# Clone the repository
git clone https://github.com/jburnhams/strata-vid.git
cd strata-vid

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

For detailed setup instructions, see [Quick Start Guide](docs/QUICKSTART.md).

## Documentation

| Document | Description |
|----------|-------------|
| **[Quick Start](docs/QUICKSTART.md)** | Get up and running in minutes |
| **[Architecture](docs/ARCHITECTURE.md)** | Technical design and data model |
| **[Implementation](docs/IMPLEMENTATION.md)** | Task roadmap organized by section |

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Zustand** - State management
- **mediabunny** - Video encoding (WebCodecs)
- **Leaflet** - Map rendering
- **@dnd-kit** - Drag-and-drop interactions

## Development

### Available Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage    # Test coverage report
npm run type-check       # TypeScript type checking
```

### Project Structure

```
src/
├── components/     # React components
│   ├── preview/    # Preview engine
│   └── timeline/   # Timeline UI
├── store/          # Zustand state (slices)
├── services/       # Business logic (AssetLoader, Compositor, ExportManager)
├── hooks/          # Custom React hooks
├── utils/          # Pure functions
└── types.ts        # TypeScript types

tests/
├── unit/           # Fast, isolated tests (with mocks)
└── integration/    # E2E tests (Playwright)

docs/               # Documentation
```

## Testing

This project follows a strict testing structure:

- **Unit tests** (`tests/unit/`) - Fast, isolated, use mocks. Run with `npm run test:unit`
- **Integration tests** (`tests/integration/`) - Slower, end-to-end. Run with `npm run test:integration`
- **Coverage** - Calculated from unit tests only. Target: >80%

See [AGENTS.md](AGENTS.md) for guidelines.

## Contributing

This is currently a personal project, but contributions are welcome once core features are stable.

### Development Workflow

1. **Pick a task** from [Implementation Roadmap](docs/IMPLEMENTATION.md)
   - Start with **Section A: Playback Foundation** for MVP
   - Tasks organized by section with clear dependencies

2. **Create a branch**
   ```bash
   git checkout -b feature/section-a-task-1
   ```

3. **Implement and test**
   - Write unit tests as you go
   - Run `npm run test:watch` in a separate terminal

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: implement playback controls (Section A, Task 2)"
   git push -u origin feature/section-a-task-1
   ```

5. **Create PR** (when ready)

## Roadmap

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for the complete task breakdown.

**MVP Focus** (Sections A-E):
1. **Section A**: Playback Foundation - Get video playing ⭐⭐⭐
2. **Section B**: Timeline Editing - Drag, resize, arrange clips ⭐⭐⭐
3. **Section C**: Preview Rendering - Overlays and composition ⭐⭐
4. **Section D**: Map & GPX Integration - Synchronized map overlay ⭐⭐
5. **Section E**: Export Pipeline - Render final MP4 ⭐⭐⭐

**Enhancement** (Sections F-G):
6. **Section F**: Project Management - Save/load, undo/redo
7. **Section G**: User Experience - Polish, tooltips, error handling

**Advanced** (Sections H-L):
8. **Section H**: Advanced Timeline - Transitions, effects, markers
9. **Section I**: Audio System - Mixing, volume, waveforms
10. **Section J**: Performance - Optimization for large projects
11. **Section K**: Advanced Map - Elevation, heatmaps, data overlays
12. **Section L**: Collaboration - Cloud storage, real-time editing

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 94+ | ✅ Full | Recommended |
| Edge 94+ | ✅ Full | Chromium-based |
| Brave | ✅ Full | Chromium-based |
| Firefox | ⚠️ Partial | Preview works, export (WebCodecs) not supported |
| Safari | ❌ None | WebCodecs not available |

**Required APIs**: WebCodecs, OffscreenCanvas, File API

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

[jburnhams](https://github.com/jburnhams)

## Acknowledgments

- **mediabunny** - Excellent WebCodecs wrapper
- **Leaflet** - Open-source mapping
- **React Team** - React 19 improvements
- **Zustand** - Lightweight state management

---

**Note**: This project is in active development. Expect breaking changes, incomplete features, and rough edges.
