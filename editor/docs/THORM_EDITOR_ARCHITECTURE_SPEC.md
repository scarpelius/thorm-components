# Thorm Editor — Architecture and Implementation Specification

**Project:** Thorm Editor (`thorm-editor`)  
**Consumer application:** PageCraft  
**Status:** Architecture baseline / agent planning input  
**Date:** 2026-10-25  
**Version:** 1.1 (incremental, human-verifiable implementation plan; proposed APIs are not implemented APIs)

> **Instruction to implementation agents:** This is an architecture and proposal document, not a claim that all described APIs exist today. Confirm the exact current Thorm checkout before modifying code. Build a visible, inert editor element first. Implement exactly one small, manually verifiable vertical slice at a time, with PHP and JavaScript responsibilities kept explicit. Stop after each slice for maintainer review. Preserve existing behavior and document architectural deviations in an Architecture Decision Record (ADR). Do not silently substitute an independent editor model, ProseMirror, TipTap, a virtual DOM, or a wholesale `innerHTML` replacement engine.

## 1. Purpose and background

PageCraft needs a Word-familiar HTML editor for structured, collaborative publications. The editor will be built as an optional **extension of Thorm**, using **Thorm IR as the document's structural representation** and the existing Thorm mounting infrastructure to manage actual DOM nodes. The editor should render ordinary, readable HTML when inactive; individual blocks or regions become editable on request or click.

The design builds on the earlier **“Build HTML Editor Plugin”** discussion and the subsequent Thorm-source architecture discussion. The central change from early proposals is decisive: **Thorm owns the IR and DOM mounting; `thorm-editor` adds editing capabilities.** There is no second independent document schema, shadow DOM copy, or different rendering pipeline.

The editor is reusable outside PageCraft. PageCraft provides document storage, permissions, lock services, revision records, and notification transport via adapters. Its publishing, page layout, and approval workflow remain separate application responsibilities.

### 1.1 Primary goals

1. Load document content as a Thorm IR subtree, optionally within a CSR island in an SSR/hybrid page.
2. Display unchanged content as standard semantic HTML when no edit is active.
3. Activate an element/region for in-place editing without replacing the existing DOM subtree.
4. Support selections across text nodes, inline wrappers, and—eventually—multiple blocks; apply formatting to the **actual selected character range**, not just entire wrapper elements.
5. Synchronize supported editing changes with the corresponding live Thorm IR in controlled transactions, preserving unaffected mount/DOM identities.
6. Identify persistent content nodes using a configurable identity adapter (PageCraft default: integer `data-id` combined with configurable `data-type`).
7. Normalize and sanitize all imported and edited HTML according to an extensible policy.
8. Provide reliable local history, persistence, revision checking, exclusive node-level locks, and propagation of committed changes to other viewers.
9. Offer a conventional Word-like toolbar and, in PageCraft, a familiar paginated visual workspace rather than forcing a perpetual continuous canvas.
10. Be testable independently of PageCraft, with adapters and fixtures for integration.

### 1.2 Non-goals and constraints

- Do **not** introduce an independent rich-text tree alongside Thorm IR as another source of structural truth.
- Do **not** use `innerHTML` to replace the editable subtree on each input, formatting operation, or save.
- Do **not** treat the browser's arbitrary `contenteditable` markup as trusted canonical content.
- Do **not** make editor core depend on CodeIgniter 4, MySQL, PageCraft tables, or PageCraft roles.
- Do **not** assume that CSR islands themselves enable live IR mutations; they only establish rendering/hydration boundaries.
- Do **not** assume ordinary reactive `repeat`, `html`, or conditional remounts are safe inside an actively edited subtree.
- Do **not** implement full collaborative simultaneous editing/CRDT/OT as the initial solution; PageCraft's requirement is **exclusive editing per node**, with committed changes broadcast.
- Do **not** commit to one `beforeinput`/MutationObserver strategy before browser experiments.
- Do **not** confuse visual pagination with physical splitting/reparenting of the underlying document content. Page layout must preserve semantic document and edit identities.
- Image manipulation, complex tables, track changes, comments anchoring, DOCX fidelity, interactive editions, and print-perfect PDF layout are distinct later workstreams unless explicitly included in an approved phase.

## 2. Decision register

| ID | Decision | Status | Notes |
|---|---|---|---|
| D-01 | Build a standalone Thorm extension/plugin called `thorm-editor` | **Decided** | PageCraft is one consumer, not a dependency |
| D-02 | Use existing Thorm IR node vocabulary for document structure | **Decided** | Additional editor metadata/capabilities allowed, not a competing tree |
| D-03 | Default view is normal HTML; activate editing only on demand | **Decided** | Click/request activation preferred |
| D-04 | Preserve DOM node identity wherever practical | **Decided** | Particularly across keystrokes and format commands |
| D-05 | Persistent identity uses configurable `(type, id)` semantics | **Decided** | PageCraft: integer `data-id`; `data-type` configurable |
| D-06 | Apply inline formatting to selected character ranges across markup boundaries | **Decided** | Must not simply wrap full parent blocks |
| D-07 | Normalization and allowed markup are extensible | **Decided** | Safe baseline policy plus custom rules |
| D-08 | Exclusive lock ownership is per independently editable node | **Decided** | Server-enforced leases; no silent concurrent writes |
| D-09 | Committed changes propagate to other open browsers | **Decided** | Push notification; SSE-first is a proposed default, not mandated |
| D-10 | Thorm gets generic pre-boot extension registration/lifecycle | **Decided in principle** | Exact public API to be designed/tested |
| D-11 | Which browser input events drive which transactions | **Experiment required** | Includes IME, mobile, undo and paste |
| D-12 | Which Thorm runtime mutation hooks are necessary | **Audit/spike required** | Avoid modifying core more than required |
| D-13 | Cross-block selection/edit scope and lock escalation | **Design + experiment required** | Must not accidentally violate single-node locks |
| D-14 | Canonical persisted representation | **Clarified below** | Normalized semantic HTML and identity metadata, round-trippable to Thorm IR; Thorm IR is the live structural representation |
| D-15 | Pagination implementation | **Separate workstream** | Familiar paginated UI is a PageCraft requirement; no automatic DOM split/reparent |

## 3. Source-based Thorm baseline and verification obligations

The following is a source audit baseline as of **2026-10-25**. This specification is authoritative for new requirements, **not** for the repository's exact current implementation. Re-run the source audit on the actual checkout.

- Thorm is PHP-authored and compiles UI to structured IR that a JS runtime mounts/reactively updates. It supports SSR/CSR/hybrid and components, atoms, events, actions, and effects: <https://thorm.dev/docs>.
- `public/runtime/index.js` creates a `PrimitiveRegistry` for built-in mounts and calls it during `boot()`. Current boot-time registration is not yet a stable public extension contract: <https://raw.githubusercontent.com/scarpelius/thorm/main/public/runtime/index.js>.
- `public/runtime/core/registry.js` exposes `register(name, Ctor)` and a mount dispatcher. This is an internal extensibility seed, not the complete plugin system: <https://raw.githubusercontent.com/scarpelius/thorm/main/public/runtime/core/registry.js>.
- `ElMount` and `TextMount` update real DOM nodes in place; hydrating SSR claims pre-existing nodes. See `public/runtime/primitives/ElMount.js` and `TextMount.js`.
- A CSR island preserves/hydrates its host element but mounts its descendants on the client; see `ElMount.js`, the PHP IR renderer, and the hybrid example at <https://thorm.dev/examples>.
- Structural primitives may remount: `HtmlMount` replaces its range on change, `ShowMount` mounts/unmounts its child, and `RepeatMount` may remount existing keyed row child content on reconciliation. See `public/runtime/primitives/{HtmlMount,ShowMount,RepeatMount}.js`.
- Atom subscribers update reactive bindings; the atom store is not a bidirectionally mutable document tree. See `public/runtime/core/atoms.js`.
- HTTP actions have limited status/body/header atom targets; this does **not** replace the editor's persistence adapter/lock protocol. See `public/runtime/core/http.js` and `core/actions.js`.

### 3.1 Mandatory repository audit task

Perform only the minimum repository inspection needed for the **current increment**. Before the first visible render, inspect how an ordinary PHP-authored Thorm element reaches a working page; do not block that render on a complete source audit. Record the commit SHA and relevant files in a short running audit log, then expand it progressively as later increments touch serialization, mounts, hydration, registration, testing or persistence. All proposed paths/APIs must be reconciled with the checkout when first used.

## 4. Conceptual architecture

```text
PageCraft (or another host)
  ├── document API / authentication / ACL / publishing workflow
  ├── storage: normalized HTML + metadata + revisions
  ├── locks + notifications
  ├── layout/pagination shell and Word-like toolbar integration
  └── Adapter implementation
                │
                ▼
Thorm runtime + optional generic extension API
  ├── PHP authors/serializes IR, SSR and CSR island boundaries
  ├── live IR subtree + atoms + mount registry + scopes
  ├── actual DOM nodes (no VDOM)
  └── extension hooks (registration / lifecycle / mounted node access)
                │
                ▼
thorm-editor extension
  ├── editor host / block discovery / identity mapping
  ├── view ↔ edit mode controller
  ├── selection abstraction and bookmark restore
  ├── command handlers and reversible transactions
  ├── browser input bridge and localized reconciliation
  ├── IR mutation and mount synchronization adapter
  ├── schema + normalization + sanitizer policy
  ├── local history / dirty state / revision-aware save coordinator
  ├── lock lease controller / external update subscriber
  └── optional toolbar command-state integration
                │
                ▼
Existing browser DOM (normal semantic HTML by default)
```

### 4.1 Ownership matrix

| Concern | Owner |
|---|---|
| IR primitives, scopes, mounting/hydration, atom notifications | Thorm core |
| Generic extension registration and safe mount services | Thorm core |
| Editing activation, selection, commands, formatting, editing normalization | `thorm-editor` |
| Live document edit transactions and IR/DOM coordination | `thorm-editor` through documented Thorm capabilities |
| Identity mapping contract | `thorm-editor`; supplied mapping by host |
| User authentication/ACL and lock authorization | Host/server |
| Persistent node revisions, audit records and locking storage | Host/server |
| Transport for save, acquire/renew/release lock, event stream | Host adapter |
| Application-specific typography, toolbar placement, page layout | Host/PageCraft |
| Trusted HTML sanitization before storage/display | Both editor client and host server (server authoritative) |

**Rule:** Only one coordinated editor transaction may intentionally change an actively edited IR subtree at a time. Browser-native DOM modifications are observations to reconcile or input to intercept, **not** an alternative permanent source of truth.

## 5. IR, DOM, document identity, and persistence

### 5.1 Live document representation

The in-memory document is a **Thorm IR subtree** of existing primitives (`el`, `text`, fragment where appropriate). Editing may add runtime-only metadata and a stable addressing index, but not redefine the document as a separate ProseMirror-like AST. The IR represents HTML structure, not merely an opaque string held in an `html()` primitive.

Example **illustrative** IR (exact keys must match audited Thorm schema):

```json
{
  "k": "el",
  "tag": "article",
  "attrs": { "data-type": "document", "data-id": "1" },
  "children": [
    { "k": "el", "tag": "h1", "attrs": { "data-type": "title", "data-id": "11" },
      "children": [ { "k": "text", "value": "Publishing today" } ] },
    { "k": "el", "tag": "p", "attrs": { "data-type": "block", "data-id": "12" },
      "children": [ { "k": "text", "value": "Hello " },
        { "k": "el", "tag": "strong", "children": [ { "k": "text", "value": "world" } ] } ] }
  ]
}
```

**Important:** The above JSON is a conceptual contract sketch. An agent must inspect actual node keys (`k`, `attrs`, text expression shapes, etc.) and output real test fixtures that use Thorm's serializer. Do not build against the illustrative shape without validation.

### 5.2 Canonical HTML vs IR: no contradiction

- **Live editing structural authority:** Thorm IR for a particular document subtree.
- **Visual representation:** its mounted, existing DOM.
- **Exchange/persistence format for PageCraft:** normalized semantic HTML plus identity/revision metadata, or a host-defined equivalent that can round-trip losslessly within the supported schema.
- **Import/export adapters:** HTML → validated Thorm IR and IR → normalized HTML.

The requirement to store normalized HTML **does not create a second live editor tree**: serialized HTML is a boundary artifact. No duplicate constantly synchronized model is kept in memory. If host infrastructure elects to store IR too, it must define a single authoritative persisted version and round-trip tests, not two independently writable copies.

### 5.3 Stable identity

PageCraft identifies persisted editable entities using a configurable pair, initially `data-type` + integer `data-id`. `data-id` alone may not be globally unique across content types. Other hosts can supply custom attributes or an identity function.

Proposed interface:

```ts
interface IdentityAdapter {
  identify(el: Element): { type: string; id: number | string } | null;
  same(a: Identity, b: Identity): boolean;
  assignNew?(node: Element, provisionalId: string): void;
  canonicalize?(identity: Identity): string;
}
```

**Invariants:** persisted PageCraft IDs are positive integer values supplied/validated by the server; temporary client IDs are distinctly namespaced and must never be mistaken for permanent numeric IDs. HTML attributes must be validated; duplicates within the configured identity scope are rejected or repaired explicitly. Runtime ephemeral IDs for *all* text/inline nodes are distinct from persisted IDs and are not leaked into the saved public HTML unless explicitly configured.

### 5.4 Structural mutation and mount safety

The central technical risk is mutating IR after mounting. Thorm today primarily treats IR as mount instructions. Editing needs *explicit* localized operations (replace text content, change inline wrappers, insert/remove/move child nodes) that preserve mount bookkeeping, reactive subscriptions, and hydration semantics.

An agent **must not** simply mutate `ir.children` and assume the DOM updates. Nor mutate the DOM and assume the runtime's mount tree stays correct.

Preferred capability boundary (names illustrative):

```ts
interface EditableSubtreeHandle {
  rootIR(): IRNode;
  rootElement(): Element;
  findNode(address: NodeAddress): MountedNode | null;
  transact(ops: readonly IROperation[], options?: TransactionOptions): TransactionResult;
  subscribe(listener: (event: SubtreeChange) => void): () => void;
  dispose(): void;
}
```

Evaluate two implementation prototypes before finalizing the internal mechanism:

1. **Mounted-node operation API:** extensions request structural changes, and Thorm updates relevant `Mount` instances, subscriptions and DOM.
2. **Editor-specific primitive/controller:** a custom mounted primitive owns a stable nested area and delegates child mounts to the existing registry, while exposing safe child operations.

Both must use Thorm IR and mount mechanics. Choose based on the smallest safe core change and test evidence; do not invent an independent renderer. Record the choice in an ADR.

## 6. Thorm extension system requirements

### 6.1 Public initialization contract

A proposed ergonomic surface (not present in the audited implementation):

```js
import { boot } from '@thorm/runtime';
import { createEditorExtension } from '@thorm/editor';

const app = boot(ir, container, {
  extensions: [createEditorExtension({ identity, schema, adapter })]
});
```

The exact package names are placeholders and depend on Thorm's existing distribution model. Register extensions **before the first IR node mounts**, including CSR islands. Extension registration must not require accessing `result.core.registry` after boot has already mounted nodes.

### 6.2 Minimum extension contract

- Unique extension name/version, compatibility metadata.
- Pre-mount setup and primitive registration, with collision detection rather than silent override.
- Access to documented, least-privilege mount services (atoms/events, registry child mounting, scope/disposal, node handles).
- An attach/detach lifecycle for relevant subtrees and cleanup on route changes.
- Optional public capability registration, including `editable-subtree` when implemented.
- Deterministic initialization order and explicit error on incompatible capability dependencies.
- No forced PageCraft dependency and no requirement for an editor plugin on non-editing pages.

Proposed shape:

```ts
interface ThormExtension {
  name: string;
  setup(api: ExtensionSetupAPI): void | (() => void);
}
interface ExtensionSetupAPI {
  registerPrimitive(name: string, ctor: PrimitiveConstructor): void;
  registerCapability?(name: string, factory: unknown): void;
  onMount?(hook: MountHook): () => void;
}
```

**Security note:** Plugins execute application JavaScript and are trusted code, not a sandbox. A plugin API is not a server authorization mechanism.

### 6.3 Backward compatibility

Without any extensions, existing Thorm apps render and hydrate exactly as before. `boot()` defaults and deprecated wrappers remain functional unless a separate approved compatibility change says otherwise. Do not add editor-specific branches to `ElMount`, `TextMount`, or the HTTP system unless a generic extension capability is demonstrably insufficient.

## 7. Editor activation and DOM ownership

### 7.1 Modes and transitions

States per editable node: `view`, `acquiring-lock`, `editing-clean`, `editing-dirty`, `saving`, `conflict`, `read-only`, `error`, `disposing`. State names are conceptual; implement a documented transition machine.

Typical local flow:

```text
view → user click/edit request → acquiring-lock
     → granted → editing-clean → user changes → editing-dirty
     → save pending → saving → save acknowledged → editing-clean
     → finish → release lock → view

acquiring-lock → denied → read-only/view + owner message
saving → conflict → conflict (no silent overwrite)
editing-* → lost lease → read-only / protected draft / explicit recovery
```

Selecting or clicking non-editable HTML should not accidentally mutate it. In view mode, normal links, copy, keyboard navigation, and browser find must remain usable. Activation is configurable (click, explicit button, keyboard shortcut, host action). Activation may be limited by permission and by lock availability.

### 7.2 Native `contenteditable` policy — unresolved implementation detail

Start with an experimental block-level `contenteditable` host. The same element should normally survive entry/exit from edit mode. Test `beforeinput`, `input`, composition events, selection APIs and MutationObserver behavior across browsers. A future multi-block editing mode is allowed; the contract must not forbid ranges crossing blocks.

On activation: capture identity, request lock, ensure mounted node handle is valid, activate only after permission/lock grant, preserve/position caret. On exit: commit or explicitly discard local draft, finalize normalization, remove edit affordances, release lock, clear listeners; do not destroy the DOM node unless an explicit structural edit requires deletion.

**Avoid** always-on `contenteditable` on the whole document as the initial implementation; it complicates boundaries, permission and independently locked nodes.

### 7.3 DOM ownership invariant

While a node is edited, no external reactive update, HTML primitive, keyed repeat remount, pagination repagination, remote notification, or route event may silently replace its DOM nodes. Such changes must either be deferred or applied through coordinated editor operations. If an external change cannot be applied safely, enter a conflict/reload workflow; never overwrite an active draft.

## 8. Selection, ranges, and formatting

### 8.1 Selection model

An editing selection is a logical **character range**, independent of transient DOM node positions. Browser `Range` and `Selection` are adapters, not persistent addresses. A proposed bookmark:

```ts
type TextPosition = {
  editableIdentity: Identity;
  pathOrRuntimeNodeId: string;
  offset: number;
  affinity?: 'before' | 'after';
};
type SelectionBookmark = {
  anchor: TextPosition;
  focus: TextPosition;
  direction: 'forward' | 'backward';
};
```

Choose and document offset units (UTF-16 code units for interoperability with browser text APIs, or Unicode scalar/grapheme indices with deterministic conversion). Never mix units. Account for surrogate pairs, combining accents, emoji and IME. A bookmark must tolerate harmless wrapper splitting/merging and must not silently point to unrelated text after a mutation.

### 8.2 Required range semantics

Example input:

```html
<p data-type="block" data-id="12">One <em>two</em> three</p>
```

A selection from the final characters of `One ` through part of `three` must apply `<strong>` only to those selected characters, traversing the `<em>` wrapper appropriately. It must **not** bold every character of the paragraph, and must preserve unselected markup.

Required command behavior:

- Resolve current browser range to logical selection before mutation.
- Split boundary text nodes at exact offsets; split or preserve inline wrappers as necessary.
- Apply or remove marks to only the selected text pieces; preserve unrelated nodes and semantics.
- Normalize adjacent equivalent wrappers and redundant empty inline nodes.
- Restore meaningful selection/caret position after the operation.
- Preserve links/marks and avoid illegal nesting according to schema policy.
- Support mixed selections with tri-state toolbar feedback (`on`, `off`, `mixed`) where applicable.

### 8.3 Cross-block selections and locks

A user may select across two blocks even if only one is active. Selection visibility does **not** automatically authorize writing both. A command affecting multiple independently locked blocks must acquire all needed locks **before mutation**, in a deterministic order, or fail without applying a partial edit. This is a required architecture guardrail, while exact user interaction for lock escalation needs a later UX decision.

### 8.4 Browser behavior spike

Implement a small nonproduction experiment covering typing, Enter, Backspace at block boundaries, formatting mixed inline markup, paste, drag/drop text, selection direction, IME composition, Android keyboard, Firefox/Chrome/Safari, undo/redo and accessibility. Compare controlled `beforeinput` operations against browser mutation + repair and hybrid approach. Choose based on measured correctness, not intuition. Store results in an ADR.

## 9. Schema, normalization, sanitation

### 9.1 Initial supported HTML profile

Baseline first editor increment:

- Blocks: `p`, `h1`, `h2`, `h3`, `ul`, `ol`, `li`.
- Inline: `strong`, `em`, `u`, `a`, `br`, plain text.
- Links: validated `href`, optional safe title/target/rel policy.
- Consistent blank paragraph representation; no uncontrolled `<div>`/`span style>` proliferation.

Profiles must be extensible to additional semantics (figures, images, tables, footnotes, annotations) without modifying the core editor command dispatcher for every new tag.

### 9.2 Policy interfaces (proposed)

```ts
interface EditorSchemaPolicy {
  allowsElement(tag: string, context: NodeContext): boolean;
  allowsAttribute(tag: string, name: string, value: string): boolean;
  normalizeSubtree(node: IRNode, context: NormalizeContext): NormalizeResult;
  validateDocument(root: IRNode): ValidationIssue[];
}
interface HtmlBoundaryAdapter {
  importHtml(untrustedHtml: string, ctx: ImportContext): IRNode;
  exportHtml(root: IRNode, ctx: ExportContext): string;
}
```

The **server** must independently sanitize received HTML against an allowlist. Client sanitization improves UX but is not a security boundary. Reject scripts, event-handler attributes, dangerous URL schemes, untrusted embedded content, and unsafe CSS. Rules for preserving configured `data-*` attributes are explicit. On invalid content, report or repair deterministically; do not silently delete user content without feedback or a logged normalization result.

### 9.3 Normalization guarantees

- Idempotence: `normalize(normalize(x)) == normalize(x)` under equivalent serialization.
- Stable identity: repairs must not change persistent IDs of unaffected nodes.
- Round-trip: `HTML → IR → HTML → IR` is semantically stable for supported markup.
- No invalid document structure (e.g. `p` nested inside `p`, unintended list nesting).
- No redundant nested identical marks (e.g. nested `<strong>` wrappers) after normalization.
- Normalization must not break selection or undo; it is part of a transaction, not an out-of-band destructive rewrite.
- Host custom normalization rules are ordered, deterministic, and individually tested.

## 10. Commands, transactions, history

### 10.1 Command layer

Proposed stable command API, with exact names subject to implementation review:

```ts
editor.execute('bold');
editor.execute('italic');
editor.execute('underline');
editor.execute('setHeading', { level: 2 });
editor.execute('toggleList', { ordered: false });
editor.execute('setLink', { href: 'https://example.org' });
editor.execute('removeLink');
editor.execute('insertParagraph');
editor.execute('undo');
editor.execute('redo');
```

Commands validate permissions, selection and lock ownership, generate a transaction, update live IR and mounts in a single coordinated unit, normalize the touched range, update history/dirty state, and emit change events.

### 10.2 Operation vocabulary

The internal operations should be small and addressable: text insertion/deletion/replacement, inline split/merge, wrapping/unwrapping marks, element attribute change, block insertion/deletion/move, and optionally node-type conversion. Names and payloads are TBD; the contract is **reversible, deterministic, scoped mutations on Thorm IR**, not replaying arbitrary HTML strings.

```ts
type EditorTransaction = {
  transactionId: string;
  identityScope: Identity[];
  baseRevisions: Record<string, number>;
  operations: IROperation[];
  selectionBefore?: SelectionBookmark;
  selectionAfter?: SelectionBookmark;
  origin: 'user' | 'command' | 'paste' | 'remote' | 'normalizer';
};
```

Transactions should either complete or roll back to a coherent state. If the implementation needs DOM-native typing followed by reconciliation, its internal transaction must still yield an auditable IR change and final consistent mounted state.

### 10.3 Undo/redo

- Per-editor-session history groups intentional actions (typing bursts versus explicit commands).
- History entries store reversible operations/inverses or validated snapshots at safe transaction boundaries, not a duplicate constantly synchronized document tree.
- Undo/redo applies through the same lock/IR-mutation path as normal commands.
- History is revision-aware: a remote change or an expired lock may invalidate a historical operation; never replay blindly.
- `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` and, where appropriate, `Ctrl+Y` map predictably; browser native history conflicts must be handled in the spike.

## 11. Host adapter and service boundaries

### 11.1 Required host contract

Proposed abstraction (not a fixed wire protocol):

```ts
interface EditorHostAdapter {
  canEdit(identity: Identity): Promise<boolean>;
  acquireLock(identity: Identity): Promise<LockGrant | LockDenied>;
  renewLock(identity: Identity, token: string): Promise<LockGrant | LockLost>;
  releaseLock(identity: Identity, token: string): Promise<void>;
  loadNode(identity: Identity): Promise<LoadedNode>;
  saveNode(request: SaveNodeRequest): Promise<SaveResult>;
  subscribe(scope: SubscriptionScope, listener: (event: EditorEvent) => void): () => void;
}
```

An adapter may be HTTP+SSE, HTTP+WebSocket, or in-memory for tests. All network, authentication, retry, error reporting, and reconnect policies are host-owned or configured through the adapter. The editor core must not issue arbitrary hard-coded PageCraft API URLs.

### 11.2 Wire-level example

```json
{
  "identity": { "type": "block", "id": 12 },
  "baseRevision": 7,
  "lockToken": "opaque-lease-token",
  "clientMutationId": "uuid-or-equivalent",
  "html": "<p data-type=\"block\" data-id=\"12\">Edited <strong>text</strong></p>"
}
```

Server response might include `{ "revision": 8, "html": "...", "committedAt": "..." }`. The server must verify authorization, ownership of the current unexpired lock, revision match, schema/HTML validity, and idempotency token before committing.

## 12. Exclusive locks, save lifecycle and cross-browser synchronization

### 12.1 Lock semantics

- A lock protects one configured editable identity, not a browser element reference.
- **Server is authoritative**: locking is not a UI flag.
- A successful lease grant includes an opaque token, owner/session metadata as policy permits, and expiration/renewal information.
- Acquire is atomic and denied if another active lease holds the identity.
- Renew periodically while editing; renew and saves must fail closed when lease is lost.
- Release when editing ends; server expiry handles crashes/tab closure.
- All writes include lock token and expected base revision; stale tokens/revisions are rejected.
- Avoid leaking tokens in rendered HTML, logs, analytics, or broadcast payloads.
- Multiple-node operations acquire locks deterministically and are atomic at the application level or rejected.

### 12.2 Revision persistence

Every committed node save creates a new monotonic revision, with author/time metadata under host policy. Server should retain previous revisions for version history and recovery. Client distinguishes: local unsaved edit, save in flight, acknowledged revision, remote committed revision, and conflict. A successful network response alone does not imply safe save unless the server acknowledges the matching revision/mutation.

### 12.3 Notification protocol

After the database commit, broadcast an event such as:

```json
{
  "event": "node.updated",
  "identity": { "type": "block", "id": 12 },
  "revision": 8,
  "mutationId": "uuid-or-equivalent",
  "actor": "non-sensitive-display-identifier"
}
```

A receiving client with no local editing/dirty state reloads the changed node and applies it through **coordinated IR/mount operations** preserving unaffected nodes. A client actively editing the same identity should ordinarily have been excluded by the lock, but must still guard against races, expired leases, and delayed events; never overwrite local content silently. Deduplicate own events, out-of-order events, and reconnect replay using revision and mutation IDs.

SSE is an appropriate initial transport for server → browser notifications; it is a **proposal**, not a requirement of the reusable extension. Reconnect must query missed revisions or reload current state. Broadcast must occur only after the save is durably committed (or through a transactional outbox).

### 12.4 Failure matrix

| Failure | Required behavior |
|---|---|
| Lock denied | Remain read-only; show identity/owner info where authorized |
| Lease expires during editing | Freeze further committed writes; preserve local draft; prompt reacquire/recovery |
| Network offline | Retain dirty local state; do not claim save succeeded; renew/recovery policy explicit |
| HTTP 409 revision conflict | Preserve local changes; offer controlled reload/resolve; no last-write-wins |
| HTTP 401/403 | Stop privileged edits and protect/discard draft only by explicit policy |
| HTTP 422 invalid HTML | Show validation errors; keep editable draft without applying unsafe HTML |
| HTTP 5xx/timeout | Retry with bounded backoff and idempotency key; avoid duplicate commit |
| SSE disconnect | Reconnect and resynchronize by revision; avoid false presence claims |
| Navigation/unmount with dirty node | User-visible exit/flush policy; dispose listeners and timers safely |
| Remote node deletion/move | Invalidate or relocate node handle intentionally; never patch stale DOM |

### 12.5 Security requirements

Server authorization is required for acquire, renew, save, release, content retrieval and notifications. Validate document/tenant boundary in every request. Use CSRF protection for cookie-authenticated writes, safe content-type handling, URL sanitation and output escaping. Rate-limit locks/saves as needed. Treat HTML and external links as untrusted. Apply app-specific content security policy; never expose arbitrary editor plugin installation to untrusted users as if it were isolated execution.

## 13. UI and publishing integration

### 13.1 Editing controls

The extension exposes command availability, active marks, selection context, dirty/saving/conflict/lock state and activation events. Hosts may render a toolbar using Thorm atoms/components. Initial useful controls: bold, italic, underline, heading styles, links, ordered/unordered lists, undo, redo, save/status; keyboard shortcuts and accessible labels required. Toolbar activation should not irretrievably lose the user's text selection (bookmark before pointer/focus transfer, restore appropriately).

### 13.2 Word-familiar pages

Long-term Word users require a **familiar paginated page workspace**, margins and a classic toolbar. This is a PageCraft application requirement, not necessarily an editor-core layout requirement. Design a page-shell/layout integration interface while keeping underlying semantic nodes stable. Pagination may be visual (CSS/page overlays) or delegated to a layout service. It must not remount focused text on repagination, and the published PDF pagination engine may differ from the live editing preview.

Page break behavior, widow/orphan rules, headers/footers, paper size and print fidelity belong to subsequent PageCraft layout specification. Do not block the first editing primitives on a complete paginator.

### 13.3 Accessibility and internationalization

Keyboard-only activation and commands; predictable focus order; visible locked/read-only states; accessible toolbar buttons; announcements for save and conflict; semantic HTML; left-to-right/right-to-left text considerations; Unicode/IME composition; clipboard and screen-reader regression tests. Plain HTML remains readable with JavaScript disabled where SSR is used, although editing requires runtime support.

## 14. Lifecycle and operational flows

### 14.1 Initial load

1. Host authorizes read access and loads normalized content and revision metadata.
2. Host converts supported normalized HTML to Thorm IR (or directly supplies equivalent valid IR).
3. Thorm renders SSR shell and either hydrates content or mounts content within a CSR island.
4. Extension registers before boot, discovers configured editable roots, indexes mounted nodes/identities, and subscribes to host events.
5. View mode renders ordinary HTML; no editing lock is acquired merely to view.

### 14.2 Edit and save

1. User activates block identity; editor checks permission and acquires server lock.
2. Editor captures IR/mounted handle and caret, enables scoped editing in place.
3. Input bridge translates browser operation into a transaction or reconciles a localized native change.
4. Transaction updates Thorm IR and mounted DOM consistently, normalizes edited scope, updates history and dirty state.
5. Save coordinator sends revision-aware normalized content through host adapter.
6. Server validates lock/revision/HTML, commits new revision, and sends acknowledgment.
7. Server broadcasts `node.updated`; other viewers reconcile only impacted content.
8. User finishes: flush or explicitly resolve draft, deactivate DOM editing, release lock.

### 14.3 Remote update while viewing

Receive event → compare revision → ignore duplicate/older update → reload or receive canonical content → convert to IR → update only the corresponding **non-editing** subtree through controlled mount operations → preserve unrelated selection/scroll → update revision state.

## 15. Package/module structure (proposed)

```text
thorm/                                  # existing project (verify paths)
  public/runtime/
    core/                               # generic extension mechanism / subtree capabilities
    primitives/                         # current primitive mounts
  src/php/                              # existing PHP IR builders/serializer
  tests/                                # existing Thorm regression tests

thorm-editor/                           # optional package, independently versioned
  src/
    extension/                          # registration, mount lifecycle, editor host
    identity/                           # configurable identity mapping and index
    ir/                                 # Thorm IR operations + mount adapter
    selection/                          # DOM ranges, logical bookmarks, mapping
    input/                              # beforeinput / input / mutation bridge
    commands/                           # text, marks, blocks, links, lists
    transactions/                       # validation, operation/inverse, history
    schema/                             # rules, normalization, sanitizer adapters
    collaboration/                      # locks, revisions, remote events
    persistence/                        # save coordinator, serialization boundary
    ui/                                 # optional toolbar bindings and styling hooks
  tests/
    unit/
    integration/
    browser/
    fixtures/
  examples/
    standalone/
    pagecraft-adapter-demo/
  docs/
    api.md
    supported-html.md
    browser-spike.md
    adrs/
```

The folder structure is a **planning candidate**, not a mandate to reorganize the existing Thorm repository. Choose mono-repo subpackage versus separate repo after inspecting versioning and build tooling. Keep editor core importable independently and demonstrable in a host-agnostic sample.

## 16. Incremental agent execution plan — visible first, one manual test at a time

### 16.1 Operating method (mandatory)

**The maintainer's workflow is the main constraint on sequencing.** Deliver the smallest end-to-end feature that can be opened and observed in a browser. Do not complete a backend architecture layer, plugin infrastructure, or a collection of invisible utilities before producing a visible editor. In every subsequent increment, introduce at most one user-observable capability (plus the minimum plumbing to support it). Each increment must be understandable, manually testable, and safe to stop after.

Rules for the implementing agent:

1. **One increment = one working checkpoint.** Implement it, run relevant checks, open the example in a browser, and provide exact manual verification steps. **Do not start the next increment until the maintainer explicitly approves.** An approval may contain changes to the plan.
2. Always provide a runnable PHP-authored Thorm example, not just unit tests or standalone JavaScript. Where JS behavior is involved, implement both the PHP declaration/configuration and its JS runtime behavior in the **same increment**.
3. Start with an **inert editor host** generated by Thorm PHP helpers and mounted/rendered as ordinary HTML. It needs no functionality whatsoever. The maintainer must be able to see it before work on the editing engine begins.
4. Avoid speculative abstractions. Add a generic Thorm extension hook only when the next visible feature actually needs it. Keep Thorm core changes small, backward-compatible, and general-purpose.
5. No premature implementation of collaboration, locking, autosave, broad toolbar suites, multilingual code generation, or the future visual page builder. The extension must be future-compatible without implementing future products now.
6. Prefer simple implementations that can be inspected and understood. Keep prototype code clearly distinguished from production contracts. Never silently change the architecture to a second document model, shadow DOM or wholesale DOM replacement strategy.
7. If an increment uncovers a design problem, explain the competing options and show the observed browser behavior. Do not decide large unresolved questions in advance.
8. Make a small, reviewable commit after each approved increment, following the maintainer's branch/PR preference. Never batch several unreviewed increments into one delivery.

**Increment delivery template:** (a) what the maintainer can now see/do; (b) PHP files changed and why; (c) JS/Thorm files changed and why; (d) exact command/URL to run the example; (e) 3–6 manual test actions and expected results; (f) automated checks run; (g) known limitations; (h) proposed next single increment. Do not claim manual testing was performed by the maintainer; request their result.

### 16.2 Milestone A — first visible editor, no editing functionality

| Step | Smallest deliverable | PHP work | JavaScript / runtime work | Manual acceptance checkpoint |
|---|---|---|---|---|
| **A1 — Visible host** | A recognizable but **inert** editor area appears on a working Thorm page. It may contain a heading and sample paragraphs. No toolbar, click handlers or `contenteditable` are required. | Create the simplest PHP-authored example using **existing** `el()` / `text()` / page infrastructure; render an editor host and sample IR subtree. | **None if existing Thorm already renders it**. Reuse existing runtime/bootstrap without changes. Minimal CSS allowed to make the host visible. | Open the example URL; see the labeled editor region and sample HTML; refresh and see the same content; inspect DOM; confirm it is not editable. **Stop for review.** |
| **A2 — PHP-facing editor declaration** | The same visible host is now created via a small reusable PHP editor helper/facade rather than example-only markup. | Add `Editor` helper or equivalent that returns normal Thorm IR, accepts child IR and a minimal optional configuration; avoid coupling to PageCraft. | None unless already required by the chosen API. | Render the same example with helper; compare DOM/visible result with A1; remove helper temporarily to verify fallback remains ordinary Thorm. **Stop.** |
| **A3 — JS extension attachment** | Editor host is identified and receives a harmless JS initialization indicator, e.g. a CSS class or nonfunctional status label. | Emit only necessary marker/configuration through normal Thorm IR. | Create tiny `thorm-editor` entrypoint with mount/dispose; if existing hooks suffice, use them. If not, add **only** the minimal generic pre-boot extension/lifecycle hook needed. | Open page; indicator appears once; repeat load; verify no duplicate initialization/listeners and other Thorm pages still work. **Stop.** |

**A1 is intentionally allowed to be aesthetically basic.** An agent must not postpone it to design registration systems, transactions or normalization layers. The host may initially be a simple bordered `<article>`/`<div>` with ordinary static content.

### 16.3 Milestone B — basic in-place editing, one observable behavior per step

| Step | Visible behavior | PHP work | JavaScript / runtime work | Manual acceptance checkpoint |
|---|---|---|---|---|
| **B1 — Activate one element** | Clicking a designated sample paragraph makes **that same DOM element** editable. | Declare which node(s) can be activated (option or IR metadata). | Implement click activation and set `contenteditable` on the existing element, without re-render. | Click paragraph; caret appears; compare DOM element reference before/after activation; other paragraphs remain plain HTML. **Stop.** |
| **B2 — Deactivate editing** | Explicit Finish/Done action returns the element to ordinary HTML; typed text remains visible locally. | Declare a minimal Finish control or configuration in PHP. | Remove editable state, listeners/focus safely; no save, persistence or IR synchronization claims yet. | Type, click Finish, confirm HTML remains, no active caret, no remount; refresh resets demo state (expected). **Stop.** |
| **B3 — Configurable block identity** | Active element shows its identity (optional inspector/debug display) using PageCraft-compatible `data-id="12"` and `data-type="block"`. | Accept configurable identity attributes and integer IDs through the PHP editor helper; generate normal IR attributes. | Add minimal identity reading/lookup, keeping runtime-only addressing separate from persistent IDs. | Inspect exact DOM attributes, activate two differently identified blocks, verify the correct ID is reported. **Stop.** |
| **B4 — Read the edited value** | A local status/preview displays the latest text of the active paragraph after user input. | Declare an optional status target or simple Thorm atom binding as appropriate. | Observe input and expose the current text, with cleanup; do **not** claim full IR synchronization yet. | Type text and watch status change; finish and re-enter; verify latest visible text. **Stop.** |
| **B5 — First IR-synchronized text edit** | Text changes are reflected in the corresponding **live Thorm IR**, with no replacement of the paragraph DOM node. | Validate the PHP-origin IR shape used by the example; add a round-trip check if PHP input/output is involved. | Implement a narrowly scoped text edit operation, ensure mount bookkeeping remains consistent; do not generalize to every edit yet. | Type a simple text change, inspect IR debug view and DOM text; verify equality, stable element identity and no unexpected overwrites. **Stop.** |

**Important:** Native editing and reconciliation are not declared solved in B1–B4. B5 is a deliberate engineering checkpoint; the agent must document the browser input strategy actually used and its limitations before expanding it.

### 16.4 Milestone C — formatting and structure, progressively

| Step | Visible behavior | PHP work | JavaScript / runtime work | Manual acceptance checkpoint |
|---|---|---|---|---|
| **C1 — One formatting command** | Bold the current selected characters **within one plain-text paragraph**. | Declare a single Bold control and initial allowed markup/config as IR. | Implement one command preserving unaffected DOM nodes where feasible. | Select part of a word; Bold; inspect `<strong>` around exactly selected characters. **Stop.** |
| **C2 — Formatting across inline tags** | Bold selection that begins in plain text and ends inside `<em>`. | Supply a PHP IR fixture with nested formatting. | Extend range mapping, splitting and normalization for this one case. | Highlight across the boundary; Bold; verify only selected characters change and existing emphasis survives. **Stop.** |
| **C3 — Finish + re-enter formatted content** | Existing bold/italic content persists across edit activation cycles and is reflected in IR. | Add server-side fixture/readback as necessary. | Stabilize inline IR/DOM round-trip and normalizer for covered tags. | Format, deactivate, reactivate; inspect identical markup and no duplicate wrappers. **Stop.** |
| **C4 — One structural operation** | Press Enter to split a paragraph (or an explicit Split command if browser behavior requires it). | Add a PHP fixture with two sibling blocks and a rule for creating an identified block. | Add exactly the structural Thorm IR/mount mutation capability required; preserve existing siblings. | Split one paragraph; verify two blocks in DOM and IR and unchanged neighboring nodes. **Stop.** |
| **C5 — Undo one operation** | Undo the last supported transaction. | Expose optional Undo control via PHP helper. | Introduce minimal reversible operation history for operations implemented so far. | Make one supported change; Undo; verify DOM and IR return to previous state. **Stop.** |
| **C6 — Add one next command at a time** | Implement italic, underline, headings, links, lists, Backspace merges, paste, etc., each as an **independent mini-step**. | Add only the matching declaration, policy, or fixture for that command. | Add only the matching command, normalization/selection logic and tests. | Maintain a separate short manual checklist per command; **stop after each command**, not after the whole feature family. |

Before a command is considered complete, its covered DOM states must agree with IR. Defer unsupported browser combinations and make those limitations explicit. Expand automation proportionately alongside each command.

### 16.5 Milestone D — persistence and collaboration, still one step at a time

| Step | Visible behavior | PHP / host responsibilities | JavaScript responsibilities | Manual acceptance checkpoint |
|---|---|---|---|---|
| **D1 — Explicit local export** | Show/export the current normalized IR or HTML from the example; **no backend save**. | Provide expected round-trip fixture/validation for data exported. | Serialize the currently supported editable subtree. | Edit, export, inspect output, compare to live document. **Stop.** |
| **D2 — Save to PHP endpoint** | Clicking Save persists one edited node and reload restores it. | Build the smallest generic PHP demo endpoint (or PageCraft adapter example) with input validation and response; no premature full backend. | Submit one supported payload, show saving/saved/error. | Edit, Save, refresh; content remains. Simulate failure and see clear feedback. **Stop.** |
| **D3 — Revision conflict** | Stale saves are rejected instead of silently overwriting. | Add one server-enforced revision condition and conflict response. | Send expected revision; retain draft on rejection. | Open two tabs, save A, attempt stale save B; B sees conflict and keeps draft. **Stop.** |
| **D4 — Exclusive edit lock** | Only one session can activate editing of the same independently editable node. | Lock acquisition/renewal/release and authorization must be server-enforced. | Request lock before activation, show unavailable state, release appropriately. | Two browsers: A edits block 12; B cannot; B can edit another block if authorized. **Stop.** |
| **D5 — Committed update notification** | A save in one tab updates the **view-only** node in another tab. | Add minimal post-commit event/SSE or other justified transport. | Receive update, compare revisions, update only non-editing subtree. | A saves; B sees change without refreshing; unrelated DOM remains stable. **Stop.** |
| **D6 — Recovery and hardening** | One fault condition per step: lost lock, network failure, reconnect, paste sanitation, accessibility, performance, etc. | Implement only server behavior needed for the chosen scenario. | Implement matching UI/transaction recovery. | Manually trigger the chosen fault, verify draft and editor state; **stop each time**. |

### 16.6 Deferred work and order flexibility

The order **within** a later milestone may be changed by the maintainer after using the preceding increment. Never treat the tables as permission to build all steps in one pass. Full Word-like toolbar, pagination, PageCraft-specific layout, multi-block selections with locks, advanced normalization, complex tables, media, tracked changes, comments, CRDT/OT, the visual web page builder and AI agent IR tooling remain **future separate increments**. Architectural provisions for those features are guidance, not prerequisite implementation tasks.

### 16.7 Progress ledger

Maintain a small checklist in `docs/implementation-progress.md` or a similar project file with: step ID, status (`not started` / `in progress` / `awaiting manual review` / `approved`), commit, example URL, manual result recorded by the maintainer, and any change to the following step. On every handoff, list exactly one proposed next step. A working A1 is a successful delivery even if no editor APIs or engine exist yet.

## 17. Required tests and acceptance scenarios

### 17.1 Tests at each layer (introduced only when that capability is implemented)

This table is a **cumulative coverage target**, not a prerequisite for A1 or any earlier increment. At each checkpoint, test only the features actually delivered; expand tests as features arrive.

| Layer | Required coverage |
|---|---|
| Thorm extension | preboot registration, duplicate primitive name, dispose, SSR hydrate, CSR island, no-plugin backward compatibility |
| IR operations | text/element insertion/removal/move, invariant preservation, rollback, mount subscription cleanup |
| Selection | forward/backward, collapsed, multi-inline, Unicode, selection restore, toolbar focus |
| Formatting | partial/mixed range wrapping, toggle off, mark merge, links, invalid nested markup |
| Normalization | idempotence, allowed attributes, XSS payload rejection, round-trip and custom rule ordering |
| Editing input | typing, Enter/Backspace boundaries, paste, IME, keyboard shortcuts, browser undo |
| Locking | concurrent acquisition, renewal, expiry, denial, stale token, release, multi-block escalation |
| Saves | optimistic revisions, duplicate request ID, offline, 409, 422, 500, timeout, retry |
| Notifications | post-commit only, remote reload, duplicate/out-of-order, reconnect, no local draft overwrite |
| Performance | sustained edits in long docs; bounded listeners; no full document remount on keystroke |
| Accessibility | focus, keyboard-only editing, screen-reader labels, read-only/locked feedback |

### 17.2 Cumulative end-to-end acceptance scenarios (automate progressively where feasible)

**A. Normal document view:** Given an authorized reader, when content loads, the output is semantic HTML with `data-type`/`data-id`; there are no edit-only wrappers affecting the published markup; links and selection behave normally.

**B. In-place activation:** Given a paragraph mounted as a Thorm IR child, when an authorized user clicks it and obtains a lock, the **same DOM element** becomes editable; no parent/neighbor subtree remount occurs.

**C. Partial formatting:** Given `<p>One <em>two</em> three</p>`, a character-range selection crossing plain/emphasized text, and a bold command, exactly the selected characters gain the strong mark; unselected characters and emphasis remain semantically correct; normalized output is stable.

**D. Editing synchronization:** Given an inserted character, editor IR and browser DOM represent the same content after transaction completion; a subsequent unrelated atom update does not overwrite or remount the active paragraph.

**E. Exclusive lock:** User A holds lock on block 12; user B cannot enter editing mode for block 12, but can view it or edit a different unlocked block if authorized.

**F. Save + broadcast:** User A edits and commits block 12 at revision 7; server returns revision 8 and broadcasts update; user B sees revision 8 without full-page reload or loss of unrelated UI state.

**G. Conflict protection:** With a stale revision or expired lock, save is rejected; editor retains unsaved local edits and presents an explicit recovery path; no silent last-write-wins.

**H. Safe paste:** Pasted external HTML containing scripts, `on*` attributes, unsafe links or unsupported formatting is sanitized and normalized; allowed text and structure are retained.

**I. History:** After formatting and typing, undo/redo restores the expected content and selection, with no extra wrappers or lost IDs.

**J. Lifecycle:** Destroy/unmount editor during clean state; all subscriptions/listeners/leases are disposed/released, and the surrounding Thorm app remains functional.

**K. Word-like host:** PageCraft hosts editor in a page-and-margin presentation with toolbar; editing does not destroy stable node identity merely because page layout recalculates.

## 18. Definition of done and code-quality requirements

For each **increment**, require only the checks relevant to the code actually introduced, a runnable example, exact manual steps, no breakage of ordinary Thorm pages, and a short explanation of changed PHP and JavaScript. Add tests and documentation proportionately as APIs emerge; do not demand locking/security/browser-matrix test suites before those features exist. For any feature that receives untrusted input or calls a server, apply the corresponding security controls immediately. Never claim IR/DOM synchronization before it is demonstrated.

Every increment handoff/PR must state: visible outcome, affected PHP and JS/core files, backward-compatibility risk, exact manual tests for the maintainer, automated checks actually run, and known limitations. Agent may update Thorm core because the project is controlled by the same maintainer, but **only with general-purpose capabilities and specific regression protection**.

### 18.1 Hard stop/review triggers for the agent

Pause feature implementation and propose an ADR (do not silently pivot) if:

1. The only apparent solution requires replacing the whole editable DOM/IR subtree for ordinary keystrokes.
2. Thorm mount tracking cannot be kept consistent after structural edits without rewriting the renderer.
3. Reliable native editing requires an independent persistent document model.
4. Selection behavior cannot preserve characters across markup boundaries.
5. Multi-block operations would violate exclusive lock semantics.
6. Page layout requires remounting focused content.
7. A proposed client-side check substitutes for server lock/authorization/HTML sanitation.

A review trigger does **not** mean the project is impossible; it means the implementation plan must explicitly confront the architectural conflict.

## 19. Agent-ready first task — start with A1 only

**Task for the coding agent: Render an inert Thorm editor host on a real page.**

1. Find the shortest existing path to display a PHP-authored Thorm page; note the relevant files and how to launch it. Do not begin a broad repository audit.
2. Create a minimal PHP example that generates an editor wrapper and two or three sample blocks using existing Thorm IR helpers. No `contenteditable`, extension registry, toolbar, buttons, transactions, persistence or JavaScript changes unless required simply to render the page.
3. Give the editor host a visible boundary/label with minimal CSS so the maintainer can identify it on screen. Keep the inner content normal semantic HTML.
4. Run whatever existing PHP syntax or smoke check applies. Do not add a new test framework just for A1.
5. Provide the exact command and browser URL, the changed PHP/CSS files, and instructions: open page, see editor region, inspect DOM, refresh, confirm not editable.
6. **Stop and await the maintainer's manual approval before starting A2.** Ask for observed problems and accept changes to the plan.

After A1 approval, the agent should propose **A2 only**, not the entire milestone. The later steps in §16 are a direction of travel, not a batch work order.

## 20. Outstanding design questions (not permission to stall the project)

The baseline is sufficiently settled to begin audit, extension registration and proof-of-concept work. The implementation agent should decide and document the following when the relevant experiments are run, rather than asking upfront abstract questions:

- Controlled `beforeinput` versus native browser DOM mutation and localized reconciliation, including IME and accessibility.
- Runtime node addressing and selection bookmark resilience after split/merge.
- Exact granular Thorm mount mutation contract and whether a new editable primitive is useful.
- Whether editor-side HTML importing/serialization can reuse existing Thorm PHP builders without forcing round trips for every edit.
- Multi-block selection behavior, transaction atomicity and lock escalation UX.
- Save scheduling (explicit save, debounce/autosave, blur), including lease duration and cancellation semantics.
- Whether an initially block-scoped editing surface can evolve to Word-like contiguous cross-block keyboard editing without violating node locks.
- Page pagination strategy and responsibility boundaries with publication layout.
- Packaging/version compatibility and API stability guarantees for extension authors.

## 21. Source and provenance notes

- Prior requirements: project discussion **“Build HTML Editor Plugin”**, 2026-10-24 (recovered discussion requirements, not a verbatim transcript), and architectural follow-up on 2026-10-25.
- Thorm repository: <https://github.com/scarpelius/thorm>
- Thorm docs: <https://thorm.dev/docs>
- Thorm examples: <https://thorm.dev/examples>
- Runtime setup: <https://raw.githubusercontent.com/scarpelius/thorm/main/public/runtime/index.js>
- Primitive registry: <https://raw.githubusercontent.com/scarpelius/thorm/main/public/runtime/core/registry.js>
- Core source paths to inspect: `public/runtime/primitives/ElMount.js`, `TextMount.js`, `HtmlMount.js`, `RepeatMount.js`, `ShowMount.js`; `public/runtime/core/atoms.js`, `hydrate.js`, `actions.js`, `http.js`; PHP IR node renderer and `client()` helper.

---

**Architecture summary:** One live Thorm IR subtree; one corresponding live browser DOM subtree; a reusable Thorm editing extension that coordinates changes between them; ordinary HTML until editing is activated; user-selected characters drive formatting; configurable identities and normalization; exclusive node locks, revision-checked saves, and post-commit propagation. Implementation decisions that depend on browser behavior are validated by experiments and ADRs, not invented prematurely.

---

## Appendix A. Future evolution: Thorm visual web page editor and IR-first tooling

**Status:** Future direction / architectural guidance, **not part of the initial PageCraft editor scope**.  
**Origin:** Follow-up discussion on 2026-10-25 about extending `thorm-editor` from document editing to complete Thorm web pages.  
**Purpose:** Preserve the design opportunities and constraints that should inform current reusable APIs without redirecting the first implementation.

### A.1 Vision and positioning

A future **Thorm Visual Page Editor** should allow humans and AI agents to inspect and modify a Thorm page through its **existing IR**, using the same mutation and runtime infrastructure as `thorm-editor`. The goal is not another HTML serializer, a DOM-replacement engine, or an unrelated drag-and-drop builder. It is a visual programming surface over Thorm's page and application structure.

Three authoring clients may operate on the same validated representation:

1. **Code-based authoring:** PHP builds Thorm IR, retaining today's PHP-first workflow.
2. **Visual authoring:** a user selects live elements and edits layout, structure, styling, components, and eventually reactive behavior.
3. **Agent authoring:** an AI agent inspects a structured page and proposes small validated IR transactions, subject to authorization and human review where appropriate.

The unifying abstraction is the IR, *not* a second page-builder schema. IR is still interpreted/mounted by the existing Thorm runtime. A complete page editor is a future consumer of generic IR-editing capabilities created for the document editor.

### A.2 Reusable foundation versus new page-builder capabilities

The initial editor should keep these subsystems **domain-neutral**: node identity/addressing, editable-range and node selection, mount-aware IR transactions, history, validation, normalization policies, extension hooks, inspection APIs, persistence adapters, and lifecycle cleanup. Rich-text-specific commands should be layered on top instead of embedded into all generic mutation interfaces.

The page editor adds capabilities not required for first-release text editing:

| Capability | Reuse or extension | Notes |
|---|---|---|
| Edit text and inline formatting | Reuse `thorm-editor` | Same character-range and DOM identity rules |
| Insert, delete, move, wrap nodes | Reuse/generalize | Operate on eligible IR subtrees; respect mount lifecycle |
| Inspect page hierarchy | Extend | Tree navigator with component and structural boundaries |
| Edit attributes and CSS | Extend | Attribute/style inspector, responsive rules and validation |
| Edit layout | New UI on existing operations | Flex/grid/spacing and responsive design controls |
| Edit components and slots | Extend | Preserve component boundaries and declared interfaces |
| Bind elements to atoms/expressions | New semantic tooling | Inspect and edit permitted reactive bindings safely |
| Configure actions/events | New semantic tooling | Use known action vocabulary and capability checks |
| Edit `show`, `repeat`, routes and conditions | New semantic tooling | Preserve source expressions and avoid destructive remounts |
| Preview live app behavior | New mode/lifecycle control | Interactions must not accidentally activate during design |

Illustrative capability configuration (not an existing API):

```js
editor.configure({
  mode: 'page',
  capabilities: [
    'text', 'formatting', 'structure', 'history',
    'layout', 'styles', 'components', 'bindings', 'actions'
  ]
});
```

The document editor may expose only the capabilities it needs. Do **not** require a page-editor feature to complete any initial PageCraft milestone.

### A.3 Live page editing modes and ownership

A page may contain links, forms, click actions, conditional content, dynamic lists, routes, and application-specific components. A click that navigates in the normal application must not also navigate when the user is trying to select an element in the page builder. Provide explicit interaction modes:

- **Design mode:** pointer interaction selects nodes and exposes editing affordances; ordinary application actions are suppressed or sandboxed as needed.
- **Content editing mode:** eligible elements enter in-place text editing without replacing unaffected DOM nodes.
- **Preview/interaction mode:** application actions behave normally, subject to the host preview environment.

These modes must have documented boundaries. An editor overlay or event interception layer may help, but the agent must experimentally verify propagation, event ordering, keyboard access, focus, nested elements, and components. Do not assume that setting `contenteditable` on the entire page will solve page editing.

Dynamic UI nodes may appear and disappear because of conditions or data changes. The page editor must distinguish **IR definitions** from **the currently rendered instances**; selecting a row generated by `repeat` is not necessarily the same as editing the repeat template or its data source.

### A.4 Thorm IR as a first-class, editable contract

A future IR-first platform benefits from explicit, inspectable contracts:

- **Versioned schema:** each supported primitive, expression, action, component boundary, and extension has defined serialization and semantics.
- **Validation:** schema, capabilities, references, nesting constraints, and permissions are checked before mutation is committed.
- **Stable addressing:** persistent edit targets are distinguishable from temporary runtime mount instances and rendered repeat-item instances.
- **Canonical serialization:** changes can be saved and compared without introducing accidental semantic differences.
- **Extension namespaces:** custom primitives and metadata are registered rather than guessed from arbitrary objects.
- **Inspectability:** tools can obtain node structure, attributes, dependencies, editable capabilities, and relevant parent/child relationships.
- **Transactional mutation:** multiple IR changes can be validated and applied atomically; unaffected DOM/mount identities should be preserved.
- **Undo, revision and diff:** changes are reviewable and reversible to the extent supported by the operation protocol.

**Important:** today's Thorm IR serves as a mounting/rendering description. It does **not** yet guarantee an editable, mutable, source-round-trippable live application graph. Generic APIs for these abilities must be audited, designed, and implemented incrementally. SSR/CSR islands determine mounting boundaries; they do not by themselves supply mutation semantics.

### A.5 Source ownership, round-trips and persistence

An edited IR tree is not automatically a faithful reconstruction of the PHP that produced it. Source code may contain loops, functions, conditions, database calls, and computed values whose provenance is absent from the emitted IR. Distinguish:

- **Semantic round-trip:** generating PHP from a supported declarative IR subset and evaluating it recreates equivalent IR behavior.
- **Source round-trip:** recreating the developer's exact original PHP. This cannot generally be guaranteed from emitted IR alone.

A possible future **IR → PHP code generator** can emit canonical PHP DSL expressions for supported constructs. It should be measured with a round-trip test such as:

```text
normalize(compilePHP(generatePHP(IR))) == normalize(IR)
```

This equality applies only to the defined, supported semantic subset and normalization rules. It does not promise reconstruction of original source formatting, variable names or arbitrary computations. Code generation is not a dependency of the document editor.

Before allowing persistent visual or agent edits to PHP-generated pages, define which representation owns the changes:

| Mode | Source of truth | Consequence |
|---|---|---|
| **Source-owned** | Original PHP | IR edits are previews or must be explicitly exported/reintegrated into source |
| **IR-owned** | Persisted IR | Visual/agent edits persist directly; PHP may be generated as an optional export |
| **Hybrid** (research) | PHP-generated base IR plus saved patches | Requires stable IDs, rebase/merge/conflict semantics and provenance tracking |

**Recommended sequencing:** support source-owned and IR-owned workflows explicitly before attempting hybrid overlays. Never silently overwrite agent/visual edits when PHP regenerates IR, and never imply that changing a generated runtime value updates the external data or source expression that produced it.

### A.6 AI agent as a controlled editing client

An AI agent should interact with Thorm through the **same inspected and validated mutation layer** used by human-facing visual tools, rather than freely patching serialized JSON or arbitrary DOM. It can request a page snapshot, discover available registered components and safe capabilities, propose a diff, validate it, preview it, and commit it with the host's authorization.

A hypothetical agent transaction (illustrative only):

```json
{
  "baseRevision": 42,
  "operations": [
    { "op": "setAttribute", "node": "button-17", "name": "class", "value": "btn btn-primary" },
    { "op": "setText", "node": "text-18", "value": "Contact us" }
  ]
}
```

Potential agent-facing operations:

1. Inspect a selected subtree or page structure without downloading unrelated application data.
2. List registered components, their allowed properties, slots, and supported editing capabilities.
3. Propose structured edits against a declared base revision and specific node identities.
4. Validate syntax, schema, references, permissions, and action capabilities *before* preview or commit.
5. Preview intended changes, obtain a concise diff and validation errors, then accept/reject/undo.
6. Commit through the same transaction/history infrastructure as the visual editor, with audit metadata.

A tool protocol such as MCP may expose these operations later; **MCP is an adapter, not the core mutation engine**. Do not make `thorm-editor` dependent on an LLM, an agent framework, or agent-generated code.

**Security:** structural validation is not sufficient by itself. Host authorization, operation scopes, protected nodes, action capability allowlists, safe URL/HTML handling, rate/resource limits, and confirmation for consequential effects remain necessary. An agent must not be able to grant itself new capabilities through an IR patch.

### A.7 Example workflow: adding a page component

An authorized user asks an agent to place a contact form after an article. The intended future sequence is:

```text
User request
  -> agent inspects current page IR and available ContactForm component
  -> agent proposes insertion at a stable document location
  -> validation checks component registration, props, permissions and revision
  -> visual preview highlights the proposed change
  -> user/host accepts
  -> one committed IR transaction updates the mounted page incrementally
  -> revision and audit record persist the change
```

Example proposed operation (not a current runtime API):

```json
{
  "operation": "insert",
  "parent": "article-12",
  "after": "paragraph-38",
  "node": {
    "type": "component",
    "name": "ContactForm",
    "props": { "submitEndpoint": "/api/contact" }
  }
}
```

This is valid **only if** the component, insertion location, properties and target capabilities exist and pass policy validation. Thorm would modify the affected portion of the mounted application rather than regenerate and swap the entire page. Backend behavior, endpoints and external data remain the responsibility of application services.

### A.8 Architectural cautions and deferred decisions

- **No universal editability assumption:** dynamic, server-produced, third-party, or computed IR may be read-only, snapshot-editable or editable through an explicit data adapter.
- **No blind source rewrites:** generated IR must not be mistaken for a parse tree of the original PHP source.
- **No uncontrolled application execution:** editing/preview modes must control actions, navigation, submission, and dangerous side effects.
- **No duplicate model:** do not introduce an unrelated page-builder state tree that competes with Thorm IR. Temporary UI state, selection maps and serialized snapshots are fine when not treated as a second document authority.
- **No forced general-purpose language:** IR expresses UI structure and supported application interactions; backend business logic remains in application services.
- **No premature multi-target compiler promise:** the immediate goal is editable, valid Thorm IR. A PHP generator is a future independent workstream.
- **No hidden complexity in generic APIs:** text-selection formatting and page-layout editing need different commands, even if they share node addressing and transaction infrastructure.

Open research items include the definition/template/instance distinction for dynamic nodes, component-slot editing semantics, IR/source provenance, preservation of focus and mount identities during live structural edits, preview sandboxing, responsive style editing, and hybrid patch rebasing.

### A.9 Recommended staged evolution

1. **Current priority — PageCraft document editor.** Deliver the baseline phases in this specification, extracting only truly reusable IR and runtime extension APIs.
2. **Generalized IR inspection and mutation.** Standardize structural transactions, node identity, schema validation, diffs, history, and extension metadata, backed by tests outside rich-text content.
3. **Visual Thorm page editor prototype.** Add hierarchy/property panels plus design/content/preview modes. Demonstrate edits on a nontrivial page with components and reactive nodes.
4. **Agent editing adapter.** Expose read, propose, validate, preview and commit APIs with permissions, revision checks and audits. Reuse the established transaction engine.
5. **Optional code generation and source workflows.** Prototype IR-to-PHP for a supported subset; evaluate source-owned and IR-owned projects before researching hybrid rebasing.

### A.10 Agent instructions and success criteria

The agent implementing the **current** editor must not add page-builder UI, agent tooling, IR-to-PHP code generation, or full source synchronization to the initial scope. It should, however, avoid hard-coding rich-text-only assumptions into identity, structural transactions, extension registration and history APIs when a small generic abstraction is demonstrably warranted.

A **future** page-editor implementation should prove at least these scenarios before claiming viability:

- A page containing normal elements, components, atom-driven text, `show`, and `repeat` can be inspected with clear definition-versus-instance identities.
- Design mode selects a link or action-bearing button without triggering its normal action; preview mode executes expected behavior in a suitably controlled environment.
- An attribute, style, text and structural edit update the corresponding IR and existing DOM without unnecessarily remounting unrelated nodes.
- The editor can reject invalid operations, revision conflicts and forbidden agent actions without partially mutating the page.
- An IR-owned project persists and reloads edits consistently; a source-owned project clearly warns that transient IR edits are not source edits.
- An AI agent can propose and preview an authorized transaction; rejection leaves the application unchanged and acceptance yields an auditable, reversible revision when the operation supports reversal.

**Summary:** The proposed Thorm web page editor is a future visual and agent-compatible client of **generalized Thorm IR editing**, not a separate framework. Keep `thorm-editor` focused on PageCraft now while making its foundational APIs reusable for page structure, application behavior inspection, validated transactions, and optional code generation later.
