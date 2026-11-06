# Phase 2 Implementation Plan — Thorm JS Editor

## Overview

Phase 2 builds the client-side editor on top of the completed Phase 1/1.1 PHP
model. The Thorm runtime renders the initial page (title heading + block content
divs per block); once the page is mounted, a plain ES module suite under
`editor/src/js/` takes over editing: it wires `contenteditable` onto each block,
applies text and structural commands, maintains a change queue, and syncs the
DOM back to IR on blur.

**Confirmed decisions (from user Q&A):**

| Decision | Choice |
|---|---|
| DOM ↔ IR sync | **Hybrid** — Thorm renders initial content; JS takes over on focus; DOM→IR serialization on **blur** |
| Save endpoint | **Minimal** in Phase 2: `POST /api/editor/{docId}` with body `{ changes: [{ blockId, ir, type }, ...] }`; writes per-block IR to `editor/storage/documents/{id}/blocks/{blockId}.json`. Validation + rate limiting deferred to Phase 3 |
| Delivery | **Plain ES modules** under `editor/src/js/`, no build step, loaded via `<script type="module">` |
| Testing | **Playwright** (npm) for E2E; **jsdom** for IR/commands unit tests |
| Initialization | Keep `window.editorState` as-is; toolbar derived from **hardcoded default** in JS; document structure derived from **DOM** (`data-block-id` attributes) |
| New example | `examples/editor/phase2-js-editor.php` (Phase 1.1 unchanged) |
| Change queue payload | **Batch** of per-block IR replacements, sent every 60 s |
| Undo/redo | **Simplified** — store only the changed node's before/after state (not full block IR) |
| Contenteditable lifecycle | Block is **NOT** contenteditable initially; JS adds `contenteditable="true"` on click, removes on blur |
| Toolbar | **Floating toolbar** that appears when a block is focused |
| Structural ops | **All** in Phase 2 — split, merge, move, insert, delete |
| Document structure | Simpler object `{ blockIds, blockOrder, blockTypes }` + map of `blockId → IR` |

## Scope

**In scope (Phase 2):**
- JS editor modules under `editor/src/js/` (IR parser, contenteditable wiring,
  commands, change queue, undo/redo, floating toolbar, document structure,
  save client).
- Minimal PHP save endpoint `POST /api/editor/{docId}` + per-block IR file
  writes under `editor/storage/documents/`.
- New example `examples/editor/phase2-js-editor.php`.
- Playwright E2E suite + jsdom unit tests for IR parser and commands.
- CSS additions for the floating toolbar.
- ROADMAP update to mark Phase 2 tasks.

**Out of scope (Phase 3+):**
- IR validation and sanitization on the server.
- Rate limiting on the save endpoint.
- `GET /api/editor/{docId}` and per-block GET endpoints (only POST is needed
  for Phase 2).
- Drag-and-drop reordering of blocks (drag handle widget renders in 1.1 but
  is not wired to a command in Phase 2; move is available via toolbar).

## File Layout (New)

```
editor/src/js/
├── editor.js            # Entry point: mounts the editor on all [data-block-id] blocks
├── ir-parser.js         # DOM → IR (serialization on blur) + IR → DOM diff helpers
├── commands.js          # Text commands (bold, italic, …) + structural commands
├── change-queue.js      # Batch queue, 60 s interval, localStorage fallback
├── undo-redo.js         # CommandStack (node-level before/after)
├── toolbar.js           # Floating toolbar (per-block, focus-driven)
├── document-structure.js # DOM-derived { blockIds, blockOrder, blockTypes } + blockId→IR map
└── save.js              # HTTP POST client for the save endpoint

editor/storage/          # Created in repo; runtime writes here
└── documents/
    └── {docId}/
        └── blocks/
            └── {blockId}.json     # Per-block IR (array of IR nodes)

examples/editor/
└── phase2-js-editor.php          # New entry point (Phase 1.1 unchanged)

editor/tests/
├── js/
│   ├── ir-parser.test.js         # jsdom: DOM→IR round-trip, IR→DOM diff
│   └── commands.test.js          # jsdom: text + structural commands
└── e2e/
    └── phase2.spec.js            # Playwright: full editing flow

playwright.config.js                 # Playwright config
package.json                         # npm: playwright, jsdom, test runner
```

## Sub-Task Breakdown

### 2.1 — IR Parser (`editor/src/js/ir-parser.js`)

**Goal:** Serialize a block's DOM content back into the editor IR format
(used by `IRToThorm.php` on the server) and provide IR→DOM diff helpers for
local re-rendering after commands.

**Details:**
- `domToIR(el: HTMLElement): IRNode[]` — walk the DOM children of a block's
  content div and produce the editor IR array format:
  ```json
  [
    { "id": "n1", "k": "el", "tag": "p", "props": {}, "children": [ ... ] },
    { "id": "t1", "k": "text", "value": "Hello" }
  ]
  ```
  - `el` nodes: `tag` = lowercase tag name; `props` = `{ style, class, attrs }`
    (mirroring `convertPropsToThorm` in `IRToThorm.php` so the round-trip is
    stable); `children` = recursive walk.
  - `text` nodes: `value` = `node.textContent` (for `#text` nodes).
  - Skip `script`, `style`, and Thorm's `fragment:start`/`fragment:end`
    comment markers.
- `irToDom(ir: IRNode[], parent: HTMLElement): HTMLElement` — build a DOM
  subtree from IR (for local re-rendering after structural commands).
- `idGen()` — deterministic per-session ID generator (`n{counter}`, `t{counter}`)
  so re-serialization produces stable IDs.
- `diffIR(oldIR, newIR): { same: boolean, nodes: { added, removed, changed } }`
  — shallow per-node comparison (by `id` where present) used to decide whether
  a block is dirty for the change queue.

**Acceptance:**
- Round-trip test: `irToDom(domToIR(el))` produces structurally equivalent
  DOM for the sample document's blocks.
- `domToIR` on the sample `block-1` content yields the same shape as
  `sample.json` (same tags, same text values, same nesting).

### 2.2 — Contenteditable Wiring

**Goal:** Manage the `contenteditable` lifecycle per block and capture edits.

**Details:**
- On page load (after Thorm mount), find all `[data-block-id]` elements.
- **Click/focus-in:** set `contenteditable="true"` on the block's content div.
- **Blur/focus-out:**
  - Remove `contenteditable="true"`.
  - Serialize the DOM back to IR via `domToIR` (2.1).
  - Replace the block's in-memory IR with the serialized version.
  - If dirty (per `diffIR`), enqueue a change entry in the change queue (2.4).
- **Input event:** mark the block as dirty (do not enqueue per keystroke).
- **Keyboard shortcuts:** `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` route to undo/redo
  (2.5) within the focused block.
- Preserve Thorm's fragment comment markers when re-serializing (skip them in
  `domToIR`; re-insert them on `irToDom` if the block is re-rendered locally).

**Acceptance:**
- Clicking a block toggles `contenteditable` on/off.
- Typing text and blurring updates the in-memory IR and enqueues a change.
- The floating toolbar appears on focus and hides on blur (2.6).

### 2.3 — Commands (`editor/src/js/commands.js`)

**Goal:** Apply text and structural operations to a block's IR tree (and
document structure for block-level ops).

**Text commands (operate on the focused block's IR):**

| Command | Behavior |
|---|---|
| `bold` | Wrap selection (or current line) in `<strong>`; toggle off if already bold |
| `italic` | Wrap selection in `<em>`; toggle off if already italic |
| `underline` | Wrap selection in `<u>`; toggle off if already underlined |
| `h1`–`h6` | Convert current line to the given heading level |
| `ul` / `ol` | Convert current line to list item; toggle list type |
| `link` | Prompt for URL (via `window.prompt`), wrap selection in `<a href>` |
| `image` | Prompt for src, insert `<img src>` at cursor |
| `insert` | Insert a new empty `<p>` at cursor position |
| `delete` | Remove current line/node at cursor |

**Structural commands (operate on document structure + block IR):**

| Command | Behavior |
|---|---|
| `splitBlock` | Split the focused block at the current line index into two blocks (new block gets a generated id, type = focused block's type, order = focused order + 1) |
| `mergeBlocks` | Merge the focused block with the next block (or with a selected set) into one; content concatenated |
| `moveBlock` | Move the focused block up/down (or to a specified index) |
| `insertBlock` | Insert a new empty block after the focused block |
| `deleteBlock` | Remove the focused block from the document |

**Implementation:**
- Each command is a function: `(context) => { before, after }` where `context`
  contains `{ blockId, nodeId?, cursor?, documentStructure }`.
- Commands mutate the in-memory IR / document structure and return the
  before/after snapshots for the command stack (2.5).
- After applying a command, re-render the affected block(s) via `irToDom`
  (2.1) and enqueue a change in the change queue (2.4).

**Acceptance:**
- jsdom unit tests for each command (2.9).
- E2E test: bold/italic toggle on a sample block; split/merge/move on the
  sample document.

### 2.4 — Change Queue (`editor/src/js/change-queue.js`) + Save Endpoint

**Goal:** Batch per-block IR replacements and send them to the server every
60 s, with localStorage fallback on failure.

**Details:**
- `ChangeQueue` class:
  - `enqueue({ blockId, ir, type })` — add a change entry; `type` is one of
    `text-edit`, `structural`, `split`, `merge`, `move`, `insert`, `delete`.
  - `flush(): Promise` — POST the batch to the save endpoint (2.4b); clear
    the queue on success; on failure, persist the queue to `localStorage`
    (`thorm-editor-queue-{docId}`) and retry on next flush.
  - `setInterval` of 60 s triggers `flush()` when the queue is non-empty.
  - `beforeunload` handler triggers a final `flush()` (fire-and-forget).
- **Payload shape:**
  ```json
  {
    "changes": [
      { "blockId": "block-1", "ir": [ ... ], "type": "text-edit" },
      { "blockId": "block-2", "ir": [ ... ], "type": "structural" }
    ]
  }
  ```
- **Save endpoint (PHP):** `POST /api/editor/{docId}`
  - Reads the JSON body, validates `changes` is an array.
  - For each change: write `editor/storage/documents/{docId}/blocks/{blockId}.json`
    with the `ir` array (create parent directories if missing).
  - Returns `200 { "ok": true, "saved": <count> }`.
  - Phase 3 adds: IR validation, sanitization, rate limiting.

**Acceptance:**
- jsdom unit test: enqueue → flush → POST called with correct payload.
- E2E test: type text, wait for flush (or trigger manually), verify the block
  IR file on disk was updated.

### 2.5 — Undo/Redo (`editor/src/js/undo-redo.js`)

**Goal:** Per-block undo/redo using node-level before/after snapshots.

**Details:**
- `CommandStack` class (per block):
  - `push({ type, nodeId, before, after })` — add a command; cap at 50.
  - `undo(): { type, nodeId, before, after } | null` — pop and apply `before`.
  - `redo(): { type, nodeId, before, after } | null` — push back and apply
    `after`.
  - `clear()` — empty the stack (on block deletion).
- **Simplified model:** each command stores only the **changed node's**
  before/after state (not the full block IR). For text edits, `before`/`after`
  are the affected node(s). For structural ops, `before`/`after` are the
  affected block's IR + the document structure slice.
- Undo/redo re-renders the affected block via `irToDom` (2.1) and enqueues
  a change (2.4).
- Structural ops (split/merge/move/insert/delete) are also tracked in a
  **document-level** command stack (separate from per-block stacks) so that
  undoing a split restores the merged block.

**Acceptance:**
- jsdom unit test: bold → undo → italic → redo → bold.
- E2E test: split a block, undo, verify single block again.

### 2.6 — Floating Toolbar (`editor/src/js/toolbar.js`)

**Goal:** A floating toolbar that appears when a block is focused.

**Details:**
- Hardcoded default command list in JS (per user decision):
  ```js
  const DEFAULT_COMMANDS = [
    { name: 'bold', label: 'Bold', icon: 'icon-bold' },
    { name: 'italic', label: 'Italic', icon: 'icon-italic' },
    { name: 'underline', label: 'Underline', icon: 'icon-underline' },
    { name: 'h2', label: 'H2', icon: 'icon-h2' },
    { name: 'ul', label: 'UL', icon: 'icon-ul' },
    { name: 'ol', label: 'OL', icon: 'icon-ol' },
    { name: 'link', label: 'Link', icon: 'icon-link' },
    { name: 'image', label: 'Image', icon: 'icon-image' },
    { name: 'insert', label: 'Insert', icon: 'icon-insert' },
    { name: 'delete', label: 'Delete', icon: 'icon-delete' },
    { name: 'splitBlock', label: 'Split', icon: 'icon-split' },
    { name: 'mergeBlocks', label: 'Merge', icon: 'icon-merge' },
    { name: 'moveBlock', label: 'Move', icon: 'icon-move' },
    { name: 'insertBlock', label: 'Insert Block', icon: 'icon-insert-block' },
    { name: 'deleteBlock', label: 'Delete Block', icon: 'icon-delete-block' },
    { name: 'undo', label: 'Undo', icon: 'icon-undo' },
    { name: 'redo', label: 'Redo', icon: 'icon-redo' },
  ];
  ```
- On block focus: create a floating toolbar positioned near the block (use
  `getBoundingClientRect()` + fixed positioning; or a simple `position:
  absolute` relative to the block's parent).
- On block blur: remove/hide the toolbar.
- Toolbar buttons dispatch the corresponding command (2.3) with the focused
  block's context.
- CSS: add `.editor-toolbar` styles to `public/css/editor.css` (floating
  box, button grid, hover states).

**Acceptance:**
- E2E test: focus a block → toolbar visible; blur → toolbar hidden; click
  bold → text is bolded.

### 2.7 — Document Structure (`editor/src/js/document-structure.js`)

**Goal:** Derive the document structure from the DOM and maintain a
`blockId → IR` map.

**Details:**
- `parseDocumentStructure(): { blockIds: string[], blockOrder: string[], blockTypes: Map<string,string>, blocks: Map<string, IRNode[]> }`
  - Walk all `[data-block-id]` elements in DOM order.
  - `blockIds` / `blockOrder` = array of `data-block-id` values in DOM order.
  - `blockTypes` = derived from the sibling `<h2>` title or a `data-type`
    attribute (fallback: `'section'`).
  - `blocks` = map of `blockId → IRNode[]` (from `window.editorState` or
    `domToIR` on first parse).
- `applyStructuralChange(change): void` — update the in-memory structure after
  a structural command (2.3) and re-render affected blocks via `irToDom` (2.1).
- `blockIdToIR(blockId): IRNode[]` — get the current IR for a block.

**Acceptance:**
- jsdom unit test: parse a DOM with 3 blocks → correct structure.
- E2E test: after split, document structure has 3 blocks.

### 2.8 — New Example (`examples/editor/phase2-js-editor.php`)

**Goal:** A new example entry point that loads the JS editor.

**Details:**
- Load `sample.json` → `DocumentStructure`.
- Build page IR: for each block, create an `EditorNode` (title heading +
  contenteditable wrapper div), attach a default `EditorToolbar` and widgets
  (same as Phase 1.1).
- Embed `window.editorState` (blockId → IR) as a `<script>` tag.
- Render via `Render` + `BuildExample` (same pattern as Phase 1.1).
- Template: use `examples/editor/templates/phase0-and-phase1.tpl.html` but
  add a `<script type="module" src="/js/editor.js"></script>` tag.
- Phase 1.1 (`phase1.1-editor-node-helper.php`) stays unchanged.

**Acceptance:**
- Running `php examples/editor/phase2-js-editor.php` produces a new example
  under `public/` that loads the JS editor.
- The JS editor initializes and the floating toolbar appears on focus.

### 2.9 — Tests (Playwright E2E + jsdom Unit)

**Goal:** E2E tests for the full editing flow; jsdom unit tests for IR parser
and commands.

**jsdom unit tests (`editor/tests/js/`):**
- `ir-parser.test.js`:
  - `domToIR` on sample blocks matches expected IR shape.
  - `irToDom` round-trip produces equivalent DOM.
  - `diffIR` detects text changes and structural changes.
- `commands.test.js`:
  - `bold` / `italic` / `underline` toggle on a sample block.
  - `splitBlock` / `mergeBlocks` / `moveBlock` on a sample document.
  - `CommandStack` undo/redo with node-level before/after.

**Playwright E2E tests (`editor/tests/e2e/`):**
- `phase2.spec.js`:
  - **Contenteditable lifecycle:** click block → `contenteditable` set; blur
    → removed.
  - **Text editing:** type text, blur, verify in-memory IR updated + change
    queued.
  - **Commands:** bold/italic toggle; heading conversion; list insertion.
  - **Structural ops:** split, merge, move, insert, delete blocks.
  - **Undo/redo:** undo a text edit; redo; undo a split.
  - **Floating toolbar:** appears on focus, hides on blur, buttons dispatch
    commands.
  - **Save:** type text, trigger flush, verify block IR file on disk updated.

**Playwright config (`playwright.config.js`):**
- `testDir: 'editor/tests/e2e'`.
- `browser: 'chromium'`.
- `project: { name: 'chromium', use: { chromium: {} } }`.
- `workers: 1` (sequential for stateful tests).

**npm setup (`package.json`):**
- `devDependencies`: `@playwright/test`, `jsdom`, `node:test` or `vitest`.
- Scripts: `test:unit` (jsdom), `test:e2e` (Playwright), `test` (both).

**Acceptance:**
- `npm run test` passes all unit + E2E tests.
- E2E tests cover the full Phase 2 feature set.

## CSS Additions (`public/css/editor.css`)

```css
.editor-toolbar {
  position: absolute;
  top: -40px;
  left: 0;
  display: flex;
  gap: 4px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
}
.editor-toolbar button {
  border: none;
  background: transparent;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.editor-toolbar button:hover {
  background: #f0f0f0;
}
```

## PHP Save Endpoint (Minimal, Phase 2)

**File:** `editor/src/php/SaveHandler.php` (or a route handler in the app).

```php
<?php
declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * Minimal save endpoint handler for Phase 2.
 *
 * POST /api/editor/{docId}
 * Body: { "changes": [ { "blockId": "block-1", "ir": [...], "type": "text-edit" }, ... ] }
 *
 * Writes each block's IR to editor/storage/documents/{docId}/blocks/{blockId}.json.
 * No validation, no sanitization, no rate limiting (Phase 3).
 */
final class SaveHandler
{
    /**
     * @param string $docId
     * @param array $body
     * @return array
     */
    public function handle(string $docId, array $body): array
    {
        $changes = $body['changes'] ?? [];
        if (!is_array($changes)) {
            return ['ok' => false, 'error' => 'invalid body'];
        }

        $saved = 0;
        foreach ($changes as $change) {
            $blockId = $change['blockId'] ?? null;
            $ir = $change['ir'] ?? null;
            if ($blockId === null || !is_array($ir)) {
                continue;
            }

            $dir = __DIR__ . '/../../storage/documents/' . $docId . '/blocks';
            $file = $dir . '/' . $blockId . '.json';

            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            file_put_contents(
                $file,
                json_encode($ir, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );
            $saved++;
        }

        return ['ok' => true, 'saved' => $saved];
    }
}
```

**Routing:** Add a route in the app that maps `POST /api/editor/{docId}` to
`SaveHandler::handle()`. (Exact routing depends on the host app; the handler
is framework-agnostic.)


Update `editor/docs/ROADMAP.md`:
- Mark all Phase 2 tasks as ✅ (Done) after implementation.
- Move Phase 3 tasks to "In Progress" after Phase 2 is complete.
- Add the new deliverables to the Deliverables section.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `contenteditable` is lossy (browsers normalize HTML) | Edited content may not match the IR tree | Use `domToIR` scoped to the single block being edited; re-render via `irToDom` after commands |
| Large documents with many blocks | Poor UX if the whole document re-renders | Per-block content editing means only the edited block's IR is updated |
| Structural ops (split/merge) can be complex | Data loss or broken structure | Thorough unit tests for each structural command; copy-on-write document structure |
| Per-block undo/redo is isolated but structural undo/redo needs coordination | Inconsistent undo state | Separate `CommandStack` per block for content commands; a single document-level `CommandStack` for structural ops |
| No sanitization | XSS vulnerability | Add sanitization in Phase 3 |
| Network failures during save | Data loss | Queue changes locally; retry on failure; persist queue to `localStorage` |

## Next Steps

1. Review and approve this plan.
2. Create `editor/src/js/` module structure (2.1–2.7).
3. Create `examples/editor/phase2-js-editor.php` (2.8).
4. Create `editor/storage/documents/` directory structure.
5. Add save endpoint in `editor/src/php/SaveHandler.php` (2.4b).
6. Add Playwright config + E2E tests (2.9).
7. Add jsdom unit tests for IR parser and commands (2.9).
8. Update `editor/docs/ROADMAP.md` (2.9).

