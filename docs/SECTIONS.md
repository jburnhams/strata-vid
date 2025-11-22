# Work Breakdown & Sections

To allow parallel development, the project is divided into 5 distinct sections.

| Section | Title | Description | Dependencies |
| :--- | :--- | :--- | :--- |
| **01** | **Core Framework & State** | Data models, Zustand store, Asset ingestion logic. | None |
| **02** | **Timeline UI** | Visual timeline, track management, drag-and-drop clips. | 01 |
| **03** | **Preview Engine** | Canvas/DOM composition, playback control, sync logic. | 01 |
| **04** | **Map & GPX Integration** | GPX parsing, Leaflet map component, sync algorithms. | 01, 03 (Partial) |
| **05** | **Export Pipeline** | `mediabunny` encoding, frame rendering loop. | 01, 03 |

## Workflow for Developers
1.  **Phase 1**: Complete Section **01** (Core). This establishes the types and store.
2.  **Phase 2**: Parallel work on **02** (Timeline), **03** (Preview), and **04** (Map).
    *   *Note*: Section 04 can mock the playback engine interfaces until 03 is ready.
3.  **Phase 3**: **05** (Export) and Integration.

## Shared Agreements
- **Types**: All types defined in `src/types` (or split into domain files).
- **Store**: All state mutations via `useProjectStore`.
- **Components**: Functional components with strict prop types.
- **Styling**: Tailwind utility classes.
