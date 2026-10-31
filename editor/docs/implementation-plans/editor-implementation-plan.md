# Editor Implementation Plan

## Overview

Phased plan for the Thorm-based browser text editor. The editor uses per-block state atoms for reactivity. Each block is a user-defined content unit (chapter, section, lesson). The document structure (block list) is stored in one atom; each block's content is stored in its own atom. This separation means structural changes (add, remove, move, split, merge) affect a single atom, while content edits affect only the atom of the block being edited, giving fine-grained re-rendering.

## Phases

### Phase 1: Document Model (Per-Block)

**Goal**: Immutable per-block model with patch operations and commands.

**Tasks**:

1.1. **Block model** (`editor/src/php/Block.php`)
    - `Block` class representing a single user-defined content unit (chapter, section, lesson).
    - Properties: `id` (unique string), `type` (e.g. `chapter`, `section`, `lesson`), `title` (string), `order` (int).
    - Content is the IR tree of that block (an array of IR nodes).
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

1.3. **Block content model** (`editor/src/php/BlockContent.php`)
    - `BlockContent` class wrapping the IR tree of a single block.
    - Properties: `blockId` (string), `tree` (IR tree array).
    - Methods:
      - `fromIR(string $blockId, array $ir): self` — construct from an IR tree.
      - `toIR(): array` — serialize the tree.
      - `findNode(string $id): ?EditorNode` — find a node by ID within the block.
      - `cloneNode(EditorNode $node): EditorNode` — deep-clone a node.
      - `cloneTree(EditorNode $node): EditorNode` — deep-clone a subtree.

1.4. **Patch operations** (`editor/src/php/BlockContent.php`)
    - `setText(string $nodeId, string $text): BlockContent` — update text content.
    - `updateStyle(string $nodeId, array $style): BlockContent` — update CSS styles.
    - `updateAttrs(string $nodeId, array $attrs): BlockContent` — update attributes.
    - `insertNode(string $parentId, EditorNode $node, int $index): BlockContent` — insert a node.
    - `removeNode(string $nodeId): BlockContent` — remove a node.
    - `moveNode(string $nodeId, string $parentId, int $index): BlockContent` — move a node.
    - Each operation returns a **new** `BlockContent` (copy-on-write).

1.5. **Command pattern** (`editor/src/php/Command.php`, `editor/src/php/CommandStack.php`)
    - `Command` interface: `execute(array $state): array`, `undo(array $state): array`, `type(): string`, `blockId(): ?string`, `nodeId(): ?string`.
    - Concrete commands: `SetTextCommand`, `UpdateStyleCommand`, `UpdateAttrsCommand`, `InsertNodeCommand`, `RemoveNodeCommand`, `MoveNodeCommand`.
    - `CommandStack` class: `push(Command $cmd)`, `pop(): Command`, `peek(): ?Command`, `clear()`, `count(): int`, `undo(array $state): array`, `redo(array $state): array`.
    - Undo/redo: `undo()` pops the last command and applies `undo()` to the current state. `redo()` re-pushes the last undone command and applies `execute()` to the current state.
    - Commands carry `blockId` and `nodeId` so they can be routed to the correct per-block atom.

1.6. **Structural commands** (`editor/src/php/StructuralCommand.php`)
    - `AddBlockCommand`, `RemoveBlockCommand`, `MoveBlockCommand`, `SplitBlockCommand`, `MergeBlocksCommand`.
    - These operate on `DocumentStructure`, not `BlockContent`.
    - `AddBlockCommand(Block $block)`, `RemoveBlockCommand(string $blockId)`, `MoveBlockCommand(string $blockId, int $index)`, `SplitBlockCommand(string $blockId, int $index)`, `MergeBlocksCommand(array $blockIds)`.
    - Each returns a new `DocumentStructure` and updates the `$doc` atom.

1.7. **Tests** (`editor/tests/BlockTest.php`, `editor/tests/DocumentStructureTest.php`, `editor/tests/BlockContentTest.php`, `editor/tests/CommandTest.php`)
    - Test `Block` serialization round-trip.
    - Test `DocumentStructure` structural operations (add, remove, move, split, merge).
    - Test `BlockContent` fromIR/toIR round-trip and node find/clone.
    - Test each patch operation (text, style, attrs, insert, remove, move).
    - Test command pattern (execute/undo) for content and structural commands.
    - Test command stack (push/pop/peek/clear/undo/redo).

### Phase 2: Editor Component (Thorm DSL)

**Goal**: Build the editor UI as a Thorm component with per-block atoms.

**Tasks**:

2.1. **Editor component** (`editor/src/php/Editor.php`)
    - `Thorm\Components\Editor\Editor` class.
    - Static factory: `Editor::get(array $slots, array $props): Node`.
    - Props:
      - `$doc` (atom) — holds the `DocumentStructure` (block list).
      - `$blocks` (map of `blockId` -> atom) — each atom holds the `BlockContent` for that block.
      - `$editing` (atom) — tracks which block/node is currently being edited.
      - `$errors` (atom) — error messages.
    - Slots: `default` (document content), `toolbar`, `status`, `actions`.
    - Renders:
      - A toolbar (`el` with buttons for all formatting and structural operations).
      - The block list: `el('div', [repeat over `$doc` atom], [block renderer per block]).`
      - A status bar (save state per block, error display).

2.2. **Block renderer** (`editor/src/php/BlockRenderer.php`)
    - `BlockRenderer::render(BlockContent $content, array $props): Node` — convert a block's IR tree to a Thorm IR node.
    - Handles: `el`, `text`, `html`, `show`, `repeat`, `component`, `slot`.
    - Assigns a unique ID to each node (e.g. `node-{uuid}`).
    - Only re-renders when the specific block's atom changes (fine-grained reactivity).

2.3. **Block list renderer** (`editor/src/php/BlockListRenderer.php`)
    - `BlockListRenderer::render(DocumentStructure $structure, array $props): Node` — render the ordered list of blocks from the `$doc` atom.
    - Each block is rendered via `BlockRenderer` using the corresponding atom from `$blocks`.
    - Structural changes (add/remove/move/split/merge) only re-render the block list, not the contents of unchanged blocks.

2.4. **Toolbar** (`editor/src/php/Toolbar.php`)
    - `Toolbar::get(array $slots, array $props): Node`.
    - Formatting buttons (bold, italic, underline, headings, lists, links, images, insert, delete): each calls a runtime capability that acts on a **single block** (the currently edited block's atom).
    - Structural buttons (split, merge, move, add block): each calls a runtime capability that acts on the `$doc` atom.
    - Undo/redo buttons: undo/redo per block (content commands) and structural undo/redo (structure commands).
    - Save button: saves the currently edited block, or the entire structure.

2.5. **Status bar** (`editor/src/php/StatusBar.php`)
    - `StatusBar::get(array $slots, array $props): Node`.
    - Displays save state **per block** (saved, unsaved, error), the currently edited block id, word count per block.

2.6. **Tests** (`editor/tests/EditorComponentTest.php`)
    - Test `Editor::get` renders the expected IR tree.
    - Test toolbar buttons have correct `on` handlers (formatting -> block atom, structural -> doc atom).
    - Test block rendering (each node type).
    - Test block list rendering (order, add/remove/move/split/merge).
    - Test status bar displays per-block save state.

### Phase 3: Runtime Capabilities (JS)

**Goal**: Implement the client-side DOM interaction capabilities, all scoped to blocks.

**Tasks**:

3.1. **Capability module** (`editor/src/js/editor-capabilities.js`)
    - `thorm.editor.activate(blockId, nodeId)`: find the block's atom, mark the block as editing, set the target node `contenteditable=true`, focus it, return `{ active: true }`.
    - `thorm.editor.deactivate(blockId, nodeId)`: mark the block as not editing, set `contenteditable=false`, blur the node, return `{ active: false }`.
    - `thorm.editor.serialize(blockId, nodeId)`: read the edited DOM, parse to an IR fragment, return the fragment.
    - `thorm.editor.apply(blockId, patch)`: read the block's atom, apply the patch, write the new `BlockContent` back to the atom, return `{ ok: true }`.
    - `thorm.editor.saveBlock(blockId)`: read the block's atom, POST to `/api/editor/{docId}/blocks/{blockId}`, update the block's save-state, return `{ ok: true/false }`.
    - `thorm.editor.saveStructure()`: read the `$doc` atom, POST to `/api/editor/{docId}`, update the structure save-state, return `{ ok: true/false }`.
    - `thorm.editor.splitBlock(blockId, index)`: structural op — read the `$doc` atom, call `splitBlock`, write the new structure back, return `{ ok: true }`.
    - `thorm.editor.mergeBlocks(blockIds)`: structural op — read the `$doc` atom, call `mergeBlocks`, write the new structure back, return `{ ok: true }`.
    - `thorm.editor.moveBlock(blockId, newIndex)`: structural op — read the `$doc` atom, call `moveBlock`, write the new structure back, return `{ ok: true }`.

3.2. **HTML to IR parser** (`editor/src/js/html-to-ir.js`)
    - `parseHtmlToIR(htmlString): array` — parse an HTML string into a Thorm IR fragment.
    - Handles: `el`, `text`, `html`, `show`, `repeat`, `component`, `slot`.
    - Assigns a unique ID to each node.

3.3. **Tests** (`editor/tests/editor-capabilities.test.js`)
    - Test `activate`/`deactivate` toggles `contenteditable` within a block.
    - Test `serialize` returns the correct IR fragment.
    - Test `apply` updates the correct block atom.
    - Test `saveBlock` POSTs to the correct block endpoint.
    - Test `saveStructure` POSTs to the correct structure endpoint.
    - Test `splitBlock`, `mergeBlocks`, `moveBlock` update the `$doc` atom.

### Phase 4: Server API

**Goal**: Implement the server-side API for per-block persistence.

**Tasks**:

4.1. **API routes**
    - Structure:
      - `GET /api/editor/{docId}` — return the `DocumentStructure`.
      - `POST /api/editor/{docId}` — save the `DocumentStructure`.
    - Block content:
      - `GET /api/editor/{docId}/blocks/{blockId}` — return the `BlockContent` for the block.
      - `POST /api/editor/{docId}/blocks/{blockId}` — save the `BlockContent` for the block.

4.2. **Storage** (`editor/src/php/Storage.php`)
    - `Storage::saveStructure(int $docId, DocumentStructure $structure): void` — write to `editor/storage/documents/{docId}.json`.
    - `Storage::loadStructure(int $docId): ?DocumentStructure` — read from `editor/storage/documents/{docId}.json`.
    - `Storage::saveBlock(int $docId, string $blockId, BlockContent $content): void` — write to `editor/storage/documents/{docId}/blocks/{blockId}.json`.
    - `Storage::loadBlock(int $docId, string $blockId): ?BlockContent` — read from `editor/storage/documents/{docId}/blocks/{blockId}.json`.
    - `Storage::delete(int $docId): void` — delete the entire document directory.

4.3. **Tests** (`editor/tests/EditorApiTest.php`)
    - Test structure save/load round-trip.
    - Test block save/load round-trip.
    - Test error handling (invalid doc id, invalid block id, missing file).

### Phase 5: Example Entry Point

**Goal**: Create a working example that demonstrates the per-block editor.

**Tasks**:

5.1. **Example entry point** (`examples/editor/index.php`)
    - Use `Thorm\Components\Editor\Editor::get(...)`.
    - Build the initial `DocumentStructure` (a sample block list) and sample `BlockContent` for each block.
    - Render via `Render` and `BuildExample`.
    - Set up the server-side API endpoints (structure and per-block).

5.2. **Sample document** (`examples/editor/sample.json`)
    - A sample `DocumentStructure` with a few blocks (e.g. a chapter, two sections, a lesson).
    - Sample `BlockContent` for each block (headings, paragraphs, lists, links, images).

5.3. **Tests** (`editor/tests/EditorExampleTest.php`)
    - Test that the example renders correctly.
    - Test that the structure and per-block API endpoints work.

### Phase 6: Integration & Polish

**Goal**: Integrate all phases and polish the per-block editor.

**Tasks**:

6.1. **Integration test** (`editor/tests/IntegrationTest.php`)
    - Test the full flow: user activates a node in a block, edits it, commits, saves the block.
    - Test per-block undo/redo (content commands isolated per block).
    - Test structural ops (split, merge, move) with the `$doc` atom.
    - Test coordination between structural and content undo/redo.

6.2. **CSS** (`editor/src/css/editor.css`)
    - Styles for the editor host, toolbar, status bar, and block containers.
    - Highlight the active block and active node.
    - Style the toolbar buttons (formatting vs structural).

6.3. **Error handling**
    - Display per-block errors in the status bar.
    - Handle network errors gracefully (per-block save failures, structure save failures).

6.4. **Performance**
    - Per-block re-rendering is fine-grained by default (only the edited block's atom triggers a re-render of that block).
    - Structural ops re-render only the block list, not block contents.
    - Profile with large documents (many blocks, large block contents).

6.5. **Security (ToDo)**
    - Implement sanitization of user input (strip `<script>` tags, etc.).
    - Validate the `DocumentStructure` and each `BlockContent` IR tree on the server.
    - Add rate limiting to the API.

## Deliverables

- `editor/docs/decisions/editor-decisions.md` — design decisions.
- `editor/docs/implementation-plans/editor-implementation-plan.md` — this document.
- `editor/src/php/Block.php` — block model.
- `editor/src/php/DocumentStructure.php` — document structure model.
- `editor/src/php/BlockContent.php` — block content model.
- `editor/src/php/EditorNode.php` — node model.
- `editor/src/php/Command.php` — command interface.
- `editor/src/php/CommandStack.php` — command stack.
- `editor/src/php/StructuralCommand.php` — structural commands.
- `editor/src/php/Editor.php` — editor component.
- `editor/src/php/BlockRenderer.php` — block renderer.
- `editor/src/php/BlockListRenderer.php` — block list renderer.
- `editor/src/php/Toolbar.php` — toolbar component.
- `editor/src/php/StatusBar.php` — status bar component.
- `editor/src/php/Storage.php` — storage layer.
- `editor/src/js/editor-capabilities.js` — runtime capabilities.
- `editor/src/js/html-to-ir.js` — HTML to IR parser.
- `examples/editor/index.php` — example entry point.
- `examples/editor/sample.json` — sample document.
- `editor/storage/documents/` — document storage directory (structure + per-block content).
- `editor/tests/` — test suite.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `contenteditable` is lossy (browsers normalize HTML) | Edited content may not match the IR tree | Use `serialize` to re-normalize into our IR tree on commit, scoped to the single block being edited. |
| Large documents with many blocks | Poor UX if the whole document re-renders | Per-block atoms make re-rendering fine-grained by default; only the edited block re-renders. |
| Structural ops (split/merge) can be complex | Data loss or broken structure | Thorough unit tests for each structural command; copy-on-write `DocumentStructure` ensures immutability. |
| Per-block undo/redo is isolated but structural undo/redo needs coordination | Inconsistent undo state | Separate `CommandStack` per block for content commands; a single structural `CommandStack` for the `$doc` atom; coordination in Phase 6. |
| No sanitization | XSS vulnerability | Add sanitization in Phase 6. |

## Next Steps

1. Review and approve this plan.
2. Start Phase 1 (Document Model).
3. Iterate through each phase, testing as we go.
