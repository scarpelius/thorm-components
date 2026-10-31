# Editor Design Decisions

## 1. Document Representation

The document is a collection of **blocks**. Each block is a user-defined, meaningful unit of content (chapter, section, lesson, etc.). The document root is a structural list of blocks.

- The document structure (block list, order, types) is stored in a state atom (`$doc`).
- Each block has its own state atom (`$block-{id}`) holding that block's content IR.
- Block content is **immutable per edit** (copy-on-write): each edit returns a new content IR.
- Block boundaries are user-defined: a block is a top-level content unit. Splitting or merging blocks is a deliberate user action.

## 2. Document Identification

Documents are identified by an **integer ID**.

- The ID is part of the URL path: `/editor/{id}`.
- The server stores document structure in `editor/storage/documents/{id}.json`.
- Each block's content is stored in `editor/storage/documents/{id}/blocks/{blockId}.json`.
- A new document is created when no document exists for the given ID.

## 3. Persistence

- Document structure and block content are stored as **IR JSON files** on disk.
- `POST /api/editor/{docId}` updates the document structure (block list, order, types).
- `GET /api/editor/{docId}` returns the document structure (block list).
- `POST /api/editor/{docId}/blocks/{blockId}` saves a block's content IR.
- `GET /api/editor/{docId}/blocks/{blockId}` returns a block's content IR.
- Storage: `editor/storage/documents/{docId}.json` for structure, `editor/storage/documents/{docId}/blocks/{blockId}.json` for block content.

## 4. Toolbar Operations

The toolbar supports the following formatting operations, most of which act on a single block:

- **Bold** (`<strong>`)
- **Italic** (`<em>`)
- **Underline** (`<u>`)
- **Headings** (`<h1>`–`<h6>`)
- **Lists** (unordered `<ul>`, ordered `<ol>`)
- **Links** (`<a href="...">`)
- **Images** (`<img src="...">`)
- **Insert** (insert a new node at the current position)
- **Delete** (remove the current node)
- **Save** (persist the block content to the server)
- **Undo/Redo** (per-block command-stack undo/redo)
- **Split block** (structural operation)
- **Merge blocks** (structural operation)
- **Move block** (structural operation)

## 5. Undo/Redo

Undo/redo is implemented **per block** using the **command pattern**.

- Each block has its own **command stack**.
- Each edit operation (text change, node move, style change, insert, delete) produces a **command** object.
- A command contains:
  - `type`: the operation type (e.g. `setText`, `moveNode`, `updateStyle`, `insertNode`, `removeNode`).
  - `blockId`: the target block.
  - `nodeId`: the target node (for operations that modify a node).
  - `before`: the state of the affected node(s) before the operation.
  - `after`: the state of the affected node(s) after the operation.
- **Undo**: pop the last command from the block's stack and apply its `before` state.
- **Redo**: push the last undone command and apply its `after` state.
- Undo/redo operates on a single block's atom.
- Structural operations (add/remove/reorder/split/merge blocks) are separate commands that only touch the document structure atom.
- Per-block command stacks can be saved with the block.

## 6. Security

- **No sanitization** is performed at this stage.
- User input (HTML) is stored and rendered as-is.
- A sanitization step is a **ToDo** for a later phase.

## 7. Editing Model

- A block is **not editable by default**.
- A node within a block becomes editable on user request (click/focus/dedicated edit action).
- The node loses `contenteditable` when focus is lost.
- While a node is editable, native DOM edits happen inside the `contenteditable` host.
- On blur/commit, the edited DOM content is serialized into a Thorm IR fragment and applied to the block's atom.
- Changes are **batched** and saved per-block.

## 8. Reactivity

- Thorm's atom reactivity is used to update the DOM.
- The `$block-{id}` atom drives re-rendering of that block's DOM.
- The `$doc` atom drives re-rendering of the block list/structure.
- The `editing` atom controls whether a node is editable.
- Per-block command stacks drive per-block undo/redo UI.
