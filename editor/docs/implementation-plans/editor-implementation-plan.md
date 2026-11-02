# Editor Implementation Plan

## Overview

Phased plan for the Thorm-based browser text editor. The editor is a **client-side** application that operates on per-block content units (chapters, sections, lessons).

### Architecture

**Client-side (browser):**
- All editor operations (find, remove, move, insert, text editing, undo/redo) happen in JavaScript
- The JS editor maintains the IR tree in memory and applies commands locally
- Changes are queued and sent to the server periodically (e.g., every 60 seconds)

**Server-side:**
- Only responsible for **creating** the initial IR for editor content and **saving** modifications
- The server builds the page as Thorm IR nodes, embedding each block's IR tree as JSON
- The server receives saved IR changes from the browser and persists them to the database
- **No editor commands run on the server**

### Key Design Decisions

1. **No `EditorNode` class** — The server doesn't need a custom node class. The stored IR is raw arrays, and the JS editor works directly with these arrays.
2. **No `BlockContent` class** — This was a carrier for commands. Commands don't run on the server. The `Block.content` array is all that's needed.
3. **No server-side `Command`/`CommandStack`** — Undo/redo is handled client-side in the JS editor.
4. **`IRToThorm` conversion** — The server converts stored block IR arrays (editor format) into Thorm IR nodes for initial page rendering.
5. **Editor state embedded in IR** — The block IR trees are embedded in the page IR as a `<script>` tag, so the JS editor can read them after the Thorm runtime mounts the page.

## Phases

### Phase 1: Document Model (Per-Block)

**Goal**: Per-block model with IR to Thorm conversion and a working example.

**Tasks**:

1.1. **Block model** (`editor/src/php/Block.php`)
    - `Block` class representing a single user-defined content unit (chapter, section, lesson).
    - Properties: `id` (unique string), `type` (e.g. `chapter`, `section`, `lesson`), `title` (string), `order` (int), `content` (IR tree array).
    - Methods: `toJson(): array`, `fromJson(array $json): self`.

1.2. **Document structure model** (`editor/src/php/DocumentStructure.php`)
    - `DocumentStructure` class holding the list of blocks (ids, types, order).
    - Properties: `blocks` (array of `Block` in order).
    - Methods:
      - `addBlock(Block $block): DocumentStructure` — append a new block.
      - `removeBlock(string $blockId): DocumentStructure` — remove a block by id.
      - `moveBlock(string $blockId, int $index): DocumentStructure` — reorder a block.
      - `splitBlock(string $blockId, int $index): DocumentStructure` — split a block at a node index into two blocks.
      - `mergeBlocks(array $blockIds): DocumentStructure` — merge consecutive blocks into one.
    - Each operation returns a **new** `DocumentStructure` (copy-on-write).

1.3. **IR to Thorm conversion** (`editor/src/php/IRToThorm.php`)
    - `irToThormNodes(array $ir): array` — converts a block's IR tree (stored array format) to Thorm IR nodes.
    - `createThormTag(string $tag, array $props, array $children): ElNode` — maps a tag name to the appropriate Thorm tag function.
    - `convertPropsToThorm(array $props): array` — converts editor IR props to Thorm ElNode props format.
    - Supports tags: `p`, `div`, `h1`–`h6`, `span`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `br`, `hr`, `blockquote`, `pre`, `code`, `img`, `table`, `tr`, `td`, `th`, `script`.
    - Fallback to `div()` for unknown tags.

1.4. **Working example** (`examples/editor/phase0-and-phase1.php`)
    - Loads sample document from `sample.json`.
    - Builds the page IR tree using Thorm primitives (`fragment`, `h1`, `h2`, `p`, `div`, `script`).
    - Converts each block's IR to Thorm nodes via `irToThormNodes()`.
    - Embeds the block IR trees as a `<script>` tag in the page IR.
    - Renders and builds the page using `BuildExample`.

1.5. **Tests** (`editor/tests/IRToThormTest.php`)
    - Tests for `irToThormNodes`, `createThormTag`, and `convertPropsToThorm`.
    - 12 test methods covering empty IR, text nodes, element nodes, nested IR, multiple nodes, unknown tag fallback, props conversion, and attribute handling.
### Phase 2: JS Editor (Client-Side)

**Goal**: Build the JavaScript editor that operates on the IR tree in memory.

**Tasks**:

2.1. **IR parser** (`editor/src/js/ir-parser.js`)
    - Parse the IR tree from the embedded `<script>` tag.
    - Build a DOM representation of the IR tree.

2.2. **Contenteditable integration**
    - Wrap each block's content in a `<div contenteditable="true">`.
    - Intercept `input` events to detect text changes.
    - Update the IR tree locally when the user edits text.

2.3. **Command pattern (JS)**
    - Implement the same command pattern as the PHP side, but in JavaScript.
    - Commands: `SetTextCommand`, `UpdateStyleCommand`, `UpdateAttrsCommand`, `InsertNodeCommand`, `RemoveNodeCommand`, `MoveNodeCommand`.
    - `CommandStack` for undo/redo, isolated per block.

2.4. **Change queue**
    - Queue changes as they are made.
    - Send queued changes to the server every 60 seconds (or on save button click).
    - Handle network errors gracefully.

2.5. **Undo/redo**
    - Per-block undo/redo using the JS `CommandStack`.
    - Structural ops (split, merge, move) handled at the document level.

### Phase 3: Save Endpoint

**Goal**: Server endpoint to receive and persist IR changes.

**Tasks**:

3.1. **Save endpoint** (`/api/save`)
    - Accepts a JSON body with an array of changes.
    - Each change has: `blockId`, `type` (e.g., `text-edit`), `data` (the updated IR or diff).
    - Applies the changes to the stored `Block.content`.
    - Saves to the database.
    - Returns a JSON response with success status.

3.2. **Validation**
    - Validate the IR structure on the server.
    - Sanitize user input (strip `<script>` tags, etc.).

3.3. **Rate limiting**
    - Add rate limiting to the API to prevent abuse.

## Deliverables

- `editor/docs/decisions/editor-decisions.md` — design decisions.
- `editor/docs/implementation-plans/editor-implementation-plan.md` — this document.
- `editor/src/php/Block.php` — block model.
- `editor/src/php/DocumentStructure.php` — document structure model.
- `editor/src/php/IRToThorm.php` — IR to Thorm conversion.
- `examples/editor/phase0-and-phase1.php` — example entry point.
- `examples/editor/sample.json` — sample document.
- `examples/editor/templates/phase0-and-phase1.tpl.html` — page template.
- `editor/tests/IRToThormTest.php` — test suite.
- `editor/src/js/` — JavaScript editor (Phase 2).
- `editor/src/php/SaveHandler.php` — save endpoint handler (Phase 3).

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `contenteditable` is lossy (browsers normalize HTML) | Edited content may not match the IR tree | Use IR-to-DOM and DOM-to-IR conversion scoped to the single block being edited. |
| Large documents with many blocks | Poor UX if the whole document re-renders | Per-block content editing means only the edited block's IR is updated. |
| Structural ops (split/merge) can be complex | Data loss or broken structure | Thorough unit tests for each structural command; copy-on-write `DocumentStructure` ensures immutability. |
| Per-block undo/redo is isolated but structural undo/redo needs coordination | Inconsistent undo state | Separate `CommandStack` per block for content commands; a single structural `CommandStack` for the document level. |
| No sanitization | XSS vulnerability | Add sanitization in Phase 3. |
| Network failures during save | Data loss | Queue changes locally; retry on failure; display error to user. |

## Next Steps

1. Review and approve this plan.
2. Phase 1 is complete (document model, IR conversion, example, tests).
3. Start Phase 2 (JS editor).
4. Start Phase 3 (save endpoint).
