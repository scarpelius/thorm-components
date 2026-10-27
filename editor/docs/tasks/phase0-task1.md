# Phase 0: Task 1 - Study the Architecture Specification

**Branch**: `phase0-task1-study_architecture_specification`  
**Created**: 2026-10-26  
**Completed**: 2026-10-27  
**Status**: ✅ Completed

## Objective
Understand the Thorm Editor architecture and requirements by studying the THORM_EDITOR_ARCHITECTURE_SPEC.md document

---

## Summary of Understanding

This document describes a **Thorm extension** called `thorm-editor` that adds in-place editing capabilities to Thorm's existing IR-based rendering system. The key insight is:

> **Thorm owns the IR and DOM mounting; `thorm-editor` adds editing capabilities.**

There is **no second document schema** - the Thorm IR subtree is the live document representation during editing.

### Core Concept
- The editor extends Thorm, not replaces it
- Thorm IR = live document structure (in memory)
- DOM = visual representation (mounted HTML)
- Normalized HTML = persisted format (for storage/transport)

### Editing Workflow
1. Document displayed as normal HTML (inactive state)
2. User clicks/activates element for editing
3. Browser's `contenteditable` provides editing surface
4. Browser input changes are reconciled back to IR
5. Changes are committed to IR in controlled transactions
6. Committed changes propagate to other viewers

---

## 1. Primary Goals (10 Goals from section 1.1)

1. **Load as Thorm IR subtree** - Load document content as a Thorm IR subtree, optionally within a CSR island in an SSR/hybrid page.
   - Significance: Uses existing Thorm infrastructure, supports hybrid rendering patterns

2. **Display as standard HTML** - Display unchanged content as standard semantic HTML when no edit is active.
   - Significance: No visual disruption, normal SEO-friendly markup

3. **In-place editing without DOM replacement** - Activate an element/region for in-place editing without replacing the existing DOM subtree.
   - Significance: Preserves DOM identity, maintains reactive bindings

4. **Cross-node selections and formatting** - Support selections across text nodes, inline wrappers, and multiple blocks; apply formatting to the actual selected character range.
   - Significance: Professional editing experience, formatting anywhere in document

5. **Synchronize with Thorm IR in transactions** - Synchronize supported editing changes with the corresponding live Thorm IR in controlled transactions, preserving unaffected mount/DOM identities.
   - Significance: Thread-safe editing, preserves DOM stability

6. **Configurable identity adapter** - Identify persistent content nodes using a configurable identity adapter (PageCraft default: integer `data-id` combined with configurable `data-type`).
   - Significance: Maps persistent document entities to DOM elements

7. **Normalize and sanitize HTML** - Normalize and sanitize all imported and edited HTML according to an extensible policy.
   - Significance: Security, consistency, controlled output format

8. **Local history and persistence** - Provide reliable local history, persistence, revision checking, exclusive node-level locks, and propagation of committed changes to other viewers.
   - Significance: Undo/redo, collaboration support, data safety

9. **Word-like toolbar workspace** - Offer a conventional Word-like toolbar and, in PageCraft, a familiar paginated visual workspace.
   - Significance: User familiarity, professional publishing experience

10. **Testable independently** - Be testable independently of PageCraft, with adapters and fixtures for integration.
    - Significance: Unit testing, reusable component

---

## 2. Non-Goals and Constraints (section 1.2)

### Not Implemented (Explicitly Avoided)
- Independent rich-text tree alongside Thorm IR
- `innerHTML` to replace editable subtree on each operation
- Treating browser `contenteditable` markup as trusted canonical content
- Dependence on CodeIgniter 4, MySQL, PageCraft tables, or PageCraft roles
- CSR islands enabling live IR mutations (they only establish boundaries)
- Ordinary reactive `repeat`, `html`, or conditional remounts inside edit subtree
- Full collaborative simultaneous editing/CRDT/OT (initially)
- One specific `beforeinput`/MutationObserver strategy before experiments
- Confusing visual pagination with physical DOM split/reparent
- Image manipulation, complex tables, track changes, comments, DOCX fidelity, print-PDF, interactive editions (later work)

### Key Constraints
1. **No second source of truth** - Only Thorm IR is the live document representation
2. **No innerHTML replacement** - DOM must be preserved, not rebuilt
3. **contenteditable is temporary** - Browser editing is observed/intercepted, not trusted
4. **Thorm IR must remain authoritative** - Editing changes reconcile to IR, not replace it

---

## 3. Rules for Implementing Agent (section 16.1)

### Operating Method (Mandatory)
- Deliver smallest end-to-end feature observable in browser
- Do not complete backend architecture before producing visible editor
- Introduce at most one user-observable capability per increment
- Each increment must be manually testable and safe to stop after

### Rules for the Implementing Agent

1. **One increment = one working checkpoint** - Implement, run checks, open example in browser, provide verification steps. **Do not start next increment until maintainer explicitly approves.**

2. **Runnable PHP-authored Thorm example** - Provide runnable PHP example, not just unit tests. Where JS behavior is involved, implement both PHP and JS in same increment.

3. **Start with inert editor host** - Create simplest PHP-authored example using existing `el()` / `text()` / page infrastructure. No functionality needed, maintainer must see it before editing engine work begins.

4. **Avoid speculative abstractions** - Add generic Thorm extension hook only when visible feature needs it. Keep Thorm core changes small, backward-compatible, and general-purpose.

5. **No premature implementation** - No collaboration, locking, autosave, broad toolbar suites, or future visual page builder. Extension must be future-compatible without implementing future products.

6. **Prefer simple implementations** - Keep prototype code clearly distinguished from production contracts. Never silently change architecture to second document model, shadow DOM, or wholesale DOM replacement.

7. **Demonstrate design decisions** - If increment uncovers problem, explain options and show observed browser behavior. Do not decide large questions in advance.

8. **Small reviewable commits** - Make a commit after each approved increment. Follow maintainer's branch/PR preference. Never batch several unreviewed increments.

---

## 4. Architecture Principles

### 4.1 Thorm Owns IR and DOM Mounting
**Implication**: The editor extends Thorm's existing capabilities, not replaces them. All editing changes must ultimately reconcile back to IR. DOM modifications observed in browser are input to be reconciled, not authoritative changes.

### 4.2 No Second Document Schema
**Implication**: Thorm IR is the single source of truth for document structure. Normalized HTML is a boundary artifact (for storage/transport), not a parallel data structure kept in memory.

### 4.3 contenteditable is Temporary Interface
**Implication**: Browser's `contenteditable` provides editing surface but its markup is not trusted. All changes must be reconciled to IR before being considered valid document modifications.

### 4.4 No Wholesale DOM Replacement
**Implication**: Editing operations must preserve DOM node identity wherever practical. Replacing DOM on every keystroke or format operation breaks reactive bindings and user experience.

---

## 5. Glossary of Terms

| Term | Definition | Context |
|------|------------|---------|
| **IR (Intermediate Representation)** | Thorm's structured document tree used for mounting to DOM. Contains `el`, `text`, and other primitives. | Live document representation in memory |
| **Primitives** | IR node types: `el` (element), `text` (text node), `html`, `show`, `repeat`, etc. | Building blocks of Thorm IR |
| **Mount** | Process of creating/updating DOM nodes from IR. `ElMount`, `TextMount` update real DOM in place. | Thorm runtime functionality |
| **Hydration** | Client-side mounting that claims pre-existing SSR DOM nodes. | Hybrid SSR/CSR pattern |
| **Atom** | Thorm's reactive store for state that triggers subscriber updates. | Reactivity mechanism |
| **CSR (Client-Side Rendering)** | Rendering that happens entirely on the client after initial SSR. | Page rendering pattern |
| **SSR (Server-Side Rendering)** | Initial HTML rendered on server, then optionally enhanced client-side. | Page rendering pattern |
| **Adapter** | Interface between thorm-editor and host (PageCraft). Handles storage, locks, permissions, notifications. | Integration point |
| **Exclusive Lock** | Server-enforced ownership of editing a particular node. Prevents concurrent writes. | Conflict resolution |
| **Normalization** | Process of cleaning and standardizing HTML according to defined policy. | Input sanitization |
| **Identity Adapter** | Interface for mapping DOM elements to persistent document entities using configurable attributes like `data-id` and `data-type`. | Node tracking across edits |

---

## 6. Milestone A - First Visible Editor (section 16.2)

### A1 - Visible Host (INERT EDITOR)
| Aspect | Deliverable |
|--------|-------------|
| Visible behavior | Recognizable but **inert** editor area |
| PHP work | Simple PHP example using existing `el()` / `text()` infrastructure |
| JS work | None if existing Thorm renders it; reuse existing runtime |
| Acceptance | Open URL; see labeled editor region and sample HTML; refresh; inspect DOM; confirm not editable |
| Key constraint | No toolbar, click handlers, or `contenteditable` required. Aesthetically basic is acceptable. |

### A2 - PHP-Facing Editor Declaration
| Aspect | Deliverable |
|--------|-------------|
| Visible behavior | Same host created via reusable PHP editor helper |
| PHP work | Add `Editor` helper/facade returning Thorm IR, accepting child IR and config |
| JS work | None unless required by API |
| Acceptance | Render same example with helper; compare DOM with A1; verify fallback |

---

## 7. Key Takeaways

1. **Thorm IR is the document** - Editing modifies IR through reconciliation, not direct DOM manipulation
2. **Incremental development** - One visible change at a time, with maintainer review between each
3. **No architectural shift** - Do not introduce ProseMirror, TipTap, virtual DOM, or wholesale DOM replacement
4. **DOM identity preserved** - Mount bookkeeping must survive editing operations
5. **PageCraft is consumer, not dependency** - Adapter pattern for host integration

---

## 8. Open Questions

1. What is the exact Thorm commit SHA and current implementation state? (Need to audit source as per section 3)
2. How exactly does Thorm's mount registry/extension registration work? (Needs runtime audit per section 6)
3. What is the exact shape of Thorm IR nodes? (JSON example given but must validate against actual implementation)
4. What runtime hooks are needed for thorm-editor to hook into Thorm's mutation system?
5. How should selection/restoration work across IR mutations?

---

## 9. Acceptance Criteria

- [x] Branch created from updated main: `phase0-task1-study_architecture_specification`
- [x] Read THORM_EDITOR_ARCHITECTURE_SPEC.md completely
- [x] Documented Understanding section completed
- [x] Primary goals identified and summarized (all 10)
- [x] Non-goals and constraints documented
- [x] Rules for implementing agent documented (all 8)
- [x] Glossary of terms created
- [x] Architecture principles documented
- [ ] Branch pushed to origin
- [ ] Ready for maintainer review
