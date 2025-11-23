# Quick Start Guide

Get Strata Vid running on your machine in minutes.

## Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **Modern Browser**: Chrome 94+, Edge 94+, or Brave (for WebCodecs support)
- **Git**: For cloning the repository

Check versions:
```bash
node --version  # Should be >= v20.0.0
npm --version
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jburnhams/strata-vid.git
   cd strata-vid
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This installs:
   - React 19, TypeScript, Vite
   - Zustand for state management
   - mediabunny for video encoding
   - Leaflet for maps
   - @dnd-kit for drag-and-drop
   - And more (see `package.json`)

3. **Start development server**
   ```bash
   npm run dev
   ```

   The app should open at `http://localhost:5173` (or similar).

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run type-check` | Check TypeScript types without building |
| `npm run lint` | Lint code (same as type-check currently) |

## Project Structure

```
strata-vid/
├── docs/                  # Documentation (you are here!)
│   ├── QUICKSTART.md      # This file
│   ├── CURRENT_STATE.md   # What works now
│   ├── ARCHITECTURE.md    # Technical overview
│   └── IMPLEMENTATION.md  # Task roadmap by section
├── src/
│   ├── components/        # React components
│   │   ├── preview/       # Preview engine
│   │   └── timeline/      # Timeline UI
│   ├── store/             # Zustand state management
│   │   └── slices/        # Store slices
│   ├── services/          # Business logic
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Pure functions
│   ├── types.ts           # TypeScript types
│   └── App.tsx            # Root component
├── tests/
│   ├── unit/              # Fast, isolated tests
│   ├── integration/       # E2E tests
│   └── utils/             # Test utilities
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## First Time Setup

### 1. Verify the app runs
After `npm run dev`, you should see:
- A dark UI with 4 panels: Library (left), Preview (center), Metadata (right), Timeline (bottom)
- A header with "Strata Vid" branding

### 2. Load a test video
- Click the "Add Asset" button in the Library panel
- Select a short video file (MP4, WebM)
- The video should appear in the asset list
- A clip should auto-add to the timeline (if implemented)

### 3. Current limitations
See `docs/CURRENT_STATE.md` for an honest assessment of what works and what doesn't.

## Common Issues

### Issue: `npm install` fails
**Solution**: Ensure Node.js >= 20.0.0. Try deleting `node_modules` and `package-lock.json`, then `npm install` again.

### Issue: Vite dev server won't start
**Solution**: Check if port 5173 is already in use. Kill the other process or specify a different port:
```bash
npm run dev -- --port 3000
```

### Issue: Tests fail with "jest: not found"
**Solution**: Make sure you ran `npm install`. Jest is a dev dependency and should be installed.

### Issue: Video won't play in browser
**Solution**:
- Check browser compatibility (Chrome 94+)
- Ensure video format is supported (H.264 MP4 works best)
- Open browser console for error messages

### Issue: TypeScript errors
**Solution**: Run `npm run type-check` to see all type errors. Fix or add `// @ts-ignore` if necessary (not ideal but sometimes needed during development).

## Testing

### Run unit tests
```bash
npm run test:unit
```

Tests are in `tests/unit/` and use Jest with React Testing Library.

### Run integration tests
```bash
npm run test:integration
```

Integration tests are in `tests/integration/` and may use Playwright for E2E scenarios.

### Coverage report
```bash
npm run test:coverage
```

Generates coverage report in `coverage/` directory. Open `coverage/lcov-report/index.html` in browser.

## Building for Production

```bash
npm run build
```

Output goes to `dist/` directory. You can serve it locally:

```bash
npm run preview
```

Or deploy `dist/` to any static hosting (Netlify, Vercel, GitHub Pages, etc.).

## Browser Requirements

### Supported Browsers
- **Chrome**: 94+ (recommended)
- **Edge**: 94+
- **Brave**: Latest

### Required APIs
- **WebCodecs**: For video encoding (Chrome 94+, Edge 94+)
- **OffscreenCanvas**: For export rendering (Chrome 69+, Firefox 105+)
- **File API**: For loading local files (all modern browsers)

### Optional APIs
- **File System Access API**: For saving projects directly to disk (Chrome 86+)

**Firefox Support**: Partial. Preview may work, but export (WebCodecs) is not supported yet.

## Development Tips

1. **Hot Reload**: Vite has excellent hot module replacement. Edit `.tsx` files and see changes instantly.

2. **State Inspection**: Install [Zustand DevTools](https://github.com/pmndrs/zustand#devtools) browser extension to inspect store state.

3. **Console Logs**: Open browser DevTools (F12) to see console logs and errors.

4. **React DevTools**: Install React DevTools extension for component inspection.

5. **Type Checking**: Run `npm run type-check` frequently to catch TypeScript errors early.

6. **Test-Driven**: Write tests as you implement features. Run `npm run test:watch` in a separate terminal.

## Next Steps

1. **Read the docs**:
   - `docs/CURRENT_STATE.md` - Understand what's implemented
   - `docs/ARCHITECTURE.md` - Learn the technical design
   - `docs/IMPLEMENTATION.md` - See task roadmap

2. **Pick a task**:
   - Start with **Section A: Playback Foundation** in `IMPLEMENTATION.md`
   - Tasks are organized by section with dependencies clearly marked

3. **Set up your editor**:
   - VSCode recommended
   - Install extensions: ESLint, Prettier, Tailwind CSS IntelliSense
   - TypeScript should provide autocomplete and type checking

4. **Join the workflow**:
   - Create feature branches: `feature/section-a-task-1`
   - Commit frequently with clear messages
   - Push and create PRs when ready

## Troubleshooting

If you encounter issues not covered here:

1. Check `docs/CURRENT_STATE.md` for known limitations
2. Look for similar issues in GitHub Issues
3. Check browser console for error messages
4. Try in a different browser (Chrome vs. Edge)
5. Create a new issue with details

## Resources

- **React 19 Docs**: https://react.dev/
- **Zustand**: https://github.com/pmndrs/zustand
- **Vite**: https://vite.dev/
- **Tailwind CSS v4**: https://tailwindcss.com/
- **mediabunny**: https://github.com/jamesmilneruk/mediabunny
- **Leaflet**: https://leafletjs.com/
- **dnd-kit**: https://dndkit.com/

Happy coding! 🎬
