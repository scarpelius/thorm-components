# Thorm Editor — Roadmap

Phased roadmap for the Thorm-based browser text editor.

## Status Legend

- ✅ **Done** — implemented and tested
- 🔄 **In Progress** — actively being worked on
- ⬜ **Not Started** — planned but not yet begun

## Completed

### ✅ Phase 0: Initial Setup
- Monorepo structure established
- Thorm runtime scaffolding
- Basic example page (`phase0-and-phase1.php`)

### ✅ Phase 1: Document Model (Per-Block)

| Task | File | Status |
|------|------|--------|
| 1.1 Block model | `editor/src/php/Block.php` | ✅ |
| 1.2 Document structure model | `editor/src/php/DocumentStructure.php` | ✅ |
| 1.3 IR to Thorm conversion | `editor/src/php/IRToThorm.php` | ✅ |
| 1.4 Working example | `examples/editor/phase0-and-phase1.php` | ✅ |
| 1.5 Tests | `editor/tests/IRToThormTest.php` | ✅ |

**Commit:** `93cda87` (example output) / Phase 1 merged via PR #6

### ✅ Phase 1.1: EditorNode Helper (PHP)

| Task | File | Status |
|------|------|--------|
| 1.1.1 EditorNode class | `editor/src/php/EditorNode.php` | ✅ |
| 1.1.2 Editor toolbar | `editor/src/php/EditorToolbar.php` | ✅ |
| 1.1.3 Display widgets | `editor/src/php/EditorWidget.php` + `widgets/` | ✅ |
| 1.1.4 Example entry point | `examples/editor/phase1.1-editor-node-helper.php` | ✅ |
| 1.1.5 Tests | `editor/tests/EditorNodeTest.php` | ✅ |

**Commit:** `740a94c` + `c46e99f` (Bootstrap 6 + CSS)

## In Progress

### 🔄 Phase 2: JS Editor (Client-Side)

**Goal:** Build the JavaScript editor that operates on the IR tree in memory.

| Task | Description | Status |
|------|-------------|--------|
| 2.1 IR parser | Parse IR from embedded `<script>` tag, build DOM | ⬜ |
| 2.2 Contenteditable integration | Wrap blocks, intercept `input`, update IR locally | ⬜ |
| 2.3 Editor commands | `SetTextCommand`, `UpdateStyleCommand`, `InsertNodeCommand`, `RemoveNodeCommand`, `MoveNodeCommand` | ⬜ |
| 2.4 Change queue | Queue changes, send to server every 60s | ⬜ |
| 2.5 Undo/redo | Per-block `CommandStack`, structural ops at document level | ⬜ |

## Not Started

### ⬜ Phase 3: Save Endpoint

**Goal:** Server endpoint to receive and persist IR changes.

| Task | Description | Status |
|------|-------------|--------|
| 3.1 Save endpoint | `/api/save` — accept JSON changes, apply to `Block.content`, save to DB | ⬜ |
| 3.2 Validation | Validate IR structure, sanitize user input | ⬜ |
| 3.3 Rate limiting | Rate limit the API to prevent abuse | ⬜ |

## Key Design Decisions

1. **No server-side `EditorNode`** — The server's *stored* IR is raw arrays. Phase 1.1 adds a server-side `EditorNode` *helper* (not a stored node class) to standardize block → page IR conversion and to carry the toolbar/command registry and display widgets.
2. **No `BlockContent` class** — Commands don't run on the server. The `Block.content` array is all that's needed.
3. **No server-side `Command`/`CommandStack`** — Undo/redo is handled client-side in the JS editor.
4. **`IRToThorm` conversion** — The server converts stored block IR arrays into Thorm IR nodes for initial page rendering.
5. **Editor state embedded in IR** — Block IR trees are embedded in the page IR as a `<script>` tag for the JS editor to read.

## Next Steps

1. Start Phase 2 (JS editor).
2. Start Phase 3 (save endpoint).