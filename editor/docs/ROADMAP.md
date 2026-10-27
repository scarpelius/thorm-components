# Thorm Editor — Implementation Roadmap

**Based on:** THORM_EDITOR_ARCHITECTURE_SPEC.md v1.1  
**Date:** 2026-10-26  
**Project:** thorm-components / thorm-editor  
**Consumer:** PageCraft

---

## Executive Summary

This roadmap provides a step-by-step implementation plan for adding editing capabilities to Thorm. The editor will extend Thorm's IR system to enable in-place content editing while preserving DOM identity and Thorm's existing mounting infrastructure.

**Core Principle:** Do not introduce a parallel document model. Thorm IR remains the single source of truth for document structure.

---

## Phase 0: Preparation & Understanding

Before any implementation, complete:

- [x] Read and understand the full THORM_EDITOR_ARCHITECTURE_SPEC.md
- [x] Review current thorm-components source code structure
- [x] Examine existing Thorm IR node types and mounting behavior
- [x] Understand the current page rendering pipeline
- [x] Set up development/testing environment
- [x] PSR-4 autoloading configured for `Thorm\Editor\` and `Thorm\Editor\Examples\`
- [ ] Review PageCraft's requirements for adapter interfaces

---

## Phase 1: Milestone A — First Visible Editor (No Editing Functionality)

### A1 — Visible Host (Inert Editor Area) ✅ COMPLETED

**Goal:** Create a recognizable but inert editor area that renders as ordinary HTML.

#### Implementation Tasks

1. **Create PHP Example** (`src/Editor/Examples/A1_InertHost.php`) ✅
   - Use existing Thorm helpers (`el`, `text`, `fragment`, `h1`, `p`)
   - Create a simple editor host container with sample content
   - Add CSS class `thorm-editor-host` to identify the host
   - Ensure content renders as normal HTML (not editable)

2. **Create Example Template** (`public/editor-inert-host.html`)
   - Simple HTML page that includes the Thorm editor host
   - Basic styling to make the editor region visually distinct

#### Delivers:
- An HTML element with `thorm-editor-host` class
- Sample content (h1 + paragraphs) that renders as static HTML
- No JavaScript initialization, no contenteditable
- Refreshable without state loss

#### Manual Acceptance Checklist

- [ ] Visit `http://localhost/editor-inert-host`
- [ ] See labeled editor region with sample content
- [ ] Content remains after refresh
- [ ] DOM inspection shows ordinary HTML elements
- [ ] Content is NOT editable (no cursor on click)

#### Files Changed
- `src/Editor/Examples/A1_InertHost.php` ✅
- `src/Editor/Editor.php` ✅ (via A2)
- `composer.json` ✅ (autoloading configuration)

***STOP FOR REVIEW***

### A2 — PHP-Facing Editor Declaration ✅ COMPLETED

**Goal:** Wrap the editor host in a reusable PHP helper/facade.

#### Implementation Tasks

1. **Create `Editor` Helper Class** (`src/Editor/Editor.php`) ✅
   - Return normal Thorm IR (not a new document model)
   - Accept child IR nodes as content
   - Accept minimal configuration (optional)
   - Avoid coupling to PageCraft

2. **Update Example** (`src/Editor/Examples/A2_WithHelper.php`) ⏳
   - Use new `Editor` helper instead of raw markup
   - Verify identical DOM output to A1

#### Delivers:
- `Editor` class that can be imported and used
- Configurable properties (id, class, attributes)
- Child IR content rendering

#### Manual Acceptance Checklist

- [ ] Same visual output as A1
- [ ] DOM structure matches A1
- [ ] Helper can be temporarily removed without breaking fallback
- [ ] Existing Thorm pages still work

#### Files Changed
- `src/Editor/Editor.php` ✅
- `src/Editor/Examples/A2_WithHelper.php` (TODO: create)

***STOP FOR REVIEW***

### A3 — JS Extension Attachment

**Goal:** Attach harmless JavaScript initialization to the editor host.

#### Implementation Tasks

1. **Create Minimal thorm-editor Entry Point** (`src/Editor/asset/editor.js`)
   - Mount/dispose functionality
   - Identify elements with `thorm-editor-host` class
   - Add nonfunctional indicator (CSS class or status label)

2. **Update PHP Helper** (`src/Editor/Editor.php`)
   - Emit marker/configuration through Thorm IR
   - Ensure single initialization (no duplicate listeners)

3. **Example Update** (`src/Editor/Examples/A3_JSAttached.php`)
   - Include JavaScript asset
   - Verify indicator appears once on load

#### Delivers:
- JavaScript that attaches to editor hosts
- No functional changes, only visual indicator
- Safe re-initialization (no duplicate listeners)

#### Manual Acceptance Checklist

- [ ] Indicator appears when page loads
- [ ] No duplicate indicators on refresh
- [ ] Other Thorm pages still work without editor
- [ ] Developer tools console shows no errors

#### Files Changed
- `src/Editor/asset/editor.js`
- `src/Editor/Editor.php`
- `src/Editor/Examples/A3_JSAttached.php`

***STOP FOR REVIEW***

---

## Phase 2: Milestone B — Basic In-Place Editing

### B1 — Activate One Element

**Goal:** Clicking a designated element makes that DOM element editable.

#### Implementation Tasks

1. **Add Activation Configuration** (`src/Editor/Editor.php`)
   - Accept `editable` option (boolean or selector)
   - Add IR metadata to mark editable nodes

2. **Implement Click Handler** (`src/Editor/asset/editor.js`)
   - Listen for click on editable elements
   - Set `contenteditable="true"` on the existing element
   - Do NOT re-render or replace DOM

3. **Example Update** (`src/Editor/Examples/B1_ActivateOne.php`)
   - Mark one paragraph as editable
   - Leave others as static

#### Delivers:
- Click on designated element activates editing
- Existing DOM element becomes `contenteditable`
- Other elements remain unchanged

#### Manual Acceptance Checklist

- [ ] Click activates caret in the element
- [ ] DOM element reference unchanged before/after activation
- [ ] Other paragraphs remain plain, non-editable HTML
- [ ] Text selection works within the element

#### Files Changed
- `src/Editor/Editor.php` (add editable configuration)
- `src/Editor/asset/editor.js` (add click handler)
- `src/Editor/Examples/B1_ActivateOne.php`

***STOP FOR REVIEW***

### B2 — Deactivate Editing

**Goal:** Explicit Finish/Done action returns element to ordinary HTML.

#### Implementation Tasks

1. **Add Finish Control** (`src/Editor/Editor.php`)
   - Minimal Finish button or configuration option
   - Optional positioning (inline, toolbar, etc.)

2. **Implement Deactivation** (`src/Editor/asset/editor.js`)
   - Remove `contenteditable` attribute
   - Clean up listeners and focus state
   - No save or IR synchronization yet

3. **Example Update** (`src/Editor/Examples/B2_Deactivate.php`)
   - Show Finish button on active element
   - Verify text remains visible

#### Delivers:
- Explicit Finish action deactivates editing
- Element returns to ordinary HTML
- Typed text remains visible locally
- No persistence or IR sync claimed

#### Manual Acceptance Checklist

- [ ] Finish button appears when editing
- [ ] Clicking finish deactivates editing
- [ ] HTML remains visible (not removed)
- [ ] No active caret after deactivation
- [ ] No remount occurs

#### Files Changed
- `src/Editor/Editor.php` (add finish control)
- `src/Editor/asset/editor.js` (add deactivation)
- `src/Editor/Examples/B2_Deactivate.php`

***STOP FOR REVIEW***

### B3 — Configurable Block Identity

**Goal:** Active element shows its identity for PageCraft compatibility.

#### Implementation Tasks

1. **Add Identity Attributes** (`src/Editor/Editor.php`)
   - Accept configurable identity attributes
   - Generate `data-id` and `data-type` attributes
   - Example: `data-id="12"` `data-type="block"`

2. **Implement Identity Reader** (`src/Editor/asset/editor.js`)
   - Read identity from DOM attributes
   - Display in debug inspector (optional)

3. **Example Update** (`src/Editor/Examples/B3_Identity.php`)
   - Two differently identified blocks
   - Verify correct ID display

#### Delivers:
- Active elements show identity attributes
- PageCraft-compatible `data-id`/`data-type` attributes
- Identity reading/lookup mechanism

#### Manual Acceptance Checklist

- [ ] DOM attributes match configuration
- [ ] Identity appears in inspector (if enabled)
- [ ] Multiple blocks with different IDs work correctly

#### Files Changed
- `src/Editor/Editor.php` (identity configuration)
- `src/Editor/asset/editor.js` (identity reader)
- `src/Editor/Examples/B3_Identity.php`

***STOP FOR REVIEW***

### B4 — Read the Edited Value

**Goal:** Local status/preview displays the latest text of the active paragraph.

#### Implementation Tasks

1. **Add Status Mechanism** (`src/Editor/Editor.php`)
   - Optional status target or Thorm atom binding
   - Simple display of current text

2. **Implement Input Observer** (`src/Editor/asset/editor.js`)
   - Observe input changes on editable element
   - Extract and expose current text
   - Ensure no full IR sync yet

3. **Example Update** (`src/Editor/Examples/B4_StatusPreview.php`)
   - Status element updates as user types

#### Delivers:
- Local preview of edited text
- Input observation without IR synchronization
- Cleanup of text (removes editable artifacts)

#### Manual Acceptance Checklist

- [ ] Status updates as user types
- [ ] Status shows latest text
- [ ] Refresh resets to original (expected behavior)

#### Files Changed
- `src/Editor/Editor.php` (status mechanism)
- `src/Editor/asset/editor.js` (input observer)
- `src/Editor/Examples/B4_StatusPreview.php`

***STOP FOR REVIEW***

### B5 — First IR-Synchronized Text Edit

**Goal:** Text changes are reflected in the live Thorm IR.

#### Implementation Tasks

1. **Validate IR Shape** (`src/Editor/Editor.php`)
   - Verify PHP-origin IR shape matches Thorm expectations
   - Add round-trip check if needed

2. **Implement Narrow Text Edit** (`src/Editor/asset/editor.js`)
   - Text change operation on selected range
   - Ensure mount bookkeeping remains consistent
   - Preserve DOM element identity
   - NO generalization to all edit operations yet

3. **Example Update** (`src/Editor/Examples/B5_IRSync.php`)
   - IR debug view shows changes
   - DOM text matches IR

#### Delivers:
- Text edits reflected in live Thorm IR
- No DOM node replacement
- Mount bookkeeping consistent

#### Manual Acceptance Checklist

- [ ] Type text change visible in IR debug view
- [ ] DOM text matches IR text
- [ ] Element identity stable (no remount)
- [ ] No unexpected overwrites

#### Files Changed
- `src/Editor/Editor.php` (IR validation)
- `src/Editor/asset/editor.js` (narrow text edit)
- `src/Editor/Examples/B5_IRSync.php`

***STOP FOR REVIEW***

---

## Phase 3: Milestone C — Formatting and Structure

### C1 — One Formatting Command (Bold Selection)

**Goal:** Bold the current selected characters within one plain-text paragraph.

#### Implementation Tasks

1. **Add Bold Command** (`src/Editor/Commands/Bold.php`)
   - Operate on selection within one paragraph
   - Convert to `<strong>` or `<b>` tag

2. **Implement JS Selection Handler** (`src/Editor/asset/editor.js`)
   - Get current selection
   - Apply bold to selected range
   - Update IR atomically

3. **Toolbar Button** (`src/Editor/Toolbar/BoldButton.php`)
   - Add bold button to toolbar
   - Wire to bold command

4. **Example Update** (`src/Editor/Examples/C1_BoldFormat.php`)
   - Bold button visible
   - Selection becomes bold text

#### Delivers:
- Bold command works on selection
- Works within a single plain-text paragraph
- IR and DOM updated together

#### Manual Acceptance Checklist

- [ ] Select text and click bold button
- [ ] Selected characters become bold
- [ ] DOM structure appropriate
- [ ] IR reflects the formatting

#### Files Changed
- `src/Editor/Commands/Bold.php`
- `src/Editor/asset/editor.js` (selection handler)
- `src/Editor/Toolbar/BoldButton.php`
- `src/Editor/Examples/C1_BoldFormat.php`

***STOP FOR REVIEW***

### C2 — Undo/Redo Infrastructure

**Goal:** Implement local history for undo/redo functionality.

#### Implementation Tasks

1. **History Stack** (`src/Editor/History/Stack.php`)
   - Undo/redo stack management
   - State snapshot capture
   - Limit stack size

2. **JS Integration** (`src/Editor/asset/editor.js`)
   - Snapshot before/after edits
   - Undo/redo keyboard shortcuts
   - Button controls

3. **Example Update** (`src/Editor/Examples/C2_UndoRedo.php`)
   - Undo/redo buttons work
   - Text changes can be undone

#### Delivers:
- Undo/redo stack
- State snapshot mechanism
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

#### Manual Acceptance Checklist

- [ ] Type text, undo restores previous state
- [ ] Redo restores after undo
- [ ] Stack limits apply correctly

#### Files Changed
- `src/Editor/History/Stack.php`
- `src/Editor/asset/editor.js` (history)
- `src/Editor/Examples/C2_UndoRedo.php`

***STOP FOR REVIEW***

### C3 — Paragraph Structure Editing

**Goal:** Insert/remove paragraph breaks, create block structure.

#### Implementation Tasks

1. **Block Commands** (`src/Editor/Commands/Block.php`)
   - Insert paragraph break (Enter key)
   - Remove paragraph break
   - Split/merge paragraphs

2. **JS Implementation** (`src/Editor/asset/editor.js`)
   - Handle Enter key
   - Manage block boundaries
   - Preserve structure

3. **Example Update** (`src/Editor/Examples/C3_ParagraphStructure.php`)
   - Enter creates new paragraph
   - Structure preserved in IR

#### Delivers:
- Paragraph structure editing
- Block boundaries respected
- IR structure matches visible format

#### Manual Acceptance Checklist

- [ ] Enter creates new paragraph
- [ ] Backspace deletes paragraph correctly
- [ ] Structure visible in IR

#### Files Changed
- `src/Editor/Commands/Block.php`
- `src/Editor/asset/editor.js` (block operations)
- `src/Editor/Examples/C3_ParagraphStructure.php`

***STOP FOR REVIEW***

---

## Phase 4: Milestone D — Production-Ready Infrastructure

### D1 — Input Sanitization & Normalization

**Goal:** Normalize and sanitize all imported and edited HTML.

#### Implementation Tasks

1. **Sanitizer Class** (`src/Editor/Sanitize/Sanitizer.php`)
   - HTML purification
   - Attribute whitelisting
   - Tag normalization

2. **Policy Configuration** (`src/Editor/Sanitize/Policy.php`)
   - Default policy
   - Extensible policy system

3. **Integration** (`src/Editor/asset/editor.js`)
   - Sanitize on input
   - Sanitize on IR sync

#### Delivers:
- Sanitized HTML input
- Configurable policy
- Extensible policy system

#### Manual Acceptance Checklist

- [ ] Dangerous tags removed
- [ ] Allowed tags preserved
- [ ] Attributes normalized

#### Files Changed
- `src/Editor/Sanitize/Sanitizer.php`
- `src/Editor/Sanitize/Policy.php`
- `src/Editor/asset/editor.js` (sanitization)

***STOP FOR REVIEW***

### D2 — Persistence Layer

**Goal:** Implement local history for undo/redo functionality.

#### Implementation Tasks

1. **Persistence Interface** (`src/Editor/Persistence/Interface.php`)
   - Save current state
   - Load state by ID
   - List saved states

2. **Memory Implementation** (`src/Editor/Persistence/Memory.php`)
   - In-memory persistence
   - For testing/demo

3. **Integration** (`src/Editor/asset/editor.js`)
   - Save onFinish
   - Load on activation

#### Delivers:
- Save/load mechanism
- Multiple persistence backends
- Automatic save on finish

#### Manual Acceptance Checklist

- [ ] Changes persist after finish
- [ ] Reload shows last saved state
- [ ] Multiple saves create history

#### Files Changed
- `src/Editor/Persistence/Interface.php`
- `src/Editor/Persistence/Memory.php`
- `src/Editor/asset/editor.js` (persistence)

***STOP FOR REVIEW***

### D3 — Toolbar Architecture

**Goal:** Implement extensible toolbar for formatting commands.

#### Implementation Tasks

1. **Toolbar Interface** (`src/Editor/Toolbar/Toolbar.php`)
   - Add/remove commands
   - Render toolbar
   - Handle commands

2. **Command Factory** (`src/Editor/Toolbar/CommandFactory.php`)
   - Mapping of command names to implementations
   - Configuration-based toolbar

3. **Example Toolbar** (`src/Editor/Toolbar/DefaultToolbar.php`)
   - Bold, italic, underline
   - Heading levels
   - List controls

#### Delivers:
- Extensible toolbar
- Configurable commands
- Default toolbar implementation

#### Manual Acceptance Checklist

- [ ] Toolbar renders
- [ ] Commands work
- [ ] New commands can be added

#### Files Changed
- `src/Editor/Toolbar/Toolbar.php`
- `src/Editor/Toolbar/CommandFactory.php`
- `src/Editor/Toolbar/DefaultToolbar.php`
- `src/Editor/Examples/D3_Toolbar.php`

***STOP FOR REVIEW***

---

## Phase 5: Milestone E — Advanced Features

### E1 — Multi-Block Selection

**Goal:** Support selections across text nodes, inline wrappers, and multiple blocks.

#### Implementation Tasks

1. **Selection Manager** (`src/Editor/Selection/Manager.php`)
   - Track selections
   - Handle multi-block ranges
   - Preserve selection across IR updates

2. **JS Selection Handling** (`src/Editor/asset/editor.js`)
   - Multi-block range support
   - Selection state persistence

#### Delivers:
- Multi-block selection
- Selection persistence
- Range tracking

#### Files Changed
- `src/Editor/Selection/Manager.php`
- `src/Editor/asset/editor.js` (selection)

***STOP FOR REVIEW***

### E2 — Collision Detection & Locking

**Goal:** Prevent concurrent modifications to the same content.

#### Implementation Tasks

1. **Lock Interface** (`src/Editor/Lock/Interface.php`)
   - Acquire lock
   - Release lock
   - Check lock status

2. **Example Integration** (`src/Editor/Examples/E2_Locks.php`)
   - Lock displayed on editing
   - Conflicts detected

#### Delivers:
- Lock acquisition
- Conflict detection
- Visual feedback

#### Files Changed
- `src/Editor/Lock/Interface.php`
- `src/Editor/Examples/E2_Locks.php`

***STOP FOR REVIEW***

### E3 — Adapter Framework

**Goal:** Enable PageCraft integration for storage, permissions, revision, notifications.

#### Implementation Tasks

1. **Adapter Interface** (`src/Editor/Adapter/Interface.php`)
   - Document storage
   - Permission checks
   - Revision records
   - Lock services

2. **PageCraft Adapters** (`src/Editor/Adapter/PageCraft.php`)
   - Implement PageCraft-specific behavior
   - Wire to existing services

#### Delivers:
- Clean adapter interface
- PageCraft integration
- Separation of concerns

#### Files Changed
- `src/Editor/Adapter/Interface.php`
- `src/Editor/Adapter/PageCraft.php`

***STOP FOR REVIEW***

---

## Phase 6: Milestone F — Documentation & Examples

### F1 — User Documentation

- [ ] Editor architecture overview
- [ ] Getting started guide
- [ ] Configuration reference
- [ ] API documentation

### F2 — Developer Examples

- [ ] Basic editor setup
- [ ] Custom toolbar
- [ ] Integration examples
- [ ] Testing examples

---

## Open Research Items

These are identified but not implemented:

- Definition/template/instance distinction for dynamic nodes
- Component-slot editing semantics
- IR/source provenance
- Preservation of focus and mount identities during live structural edits
- Preview sandboxing
- Responsive style editing
- Hybrid patch rebasing

---

## Success Criteria

The implementation is considered successful when:

1. ✅ An inert editor host renders as ordinary HTML (A1 completed)
2. ✅ Elements can be activated for editing without DOM replacement (A3 pending)
3. ✅ Text edits are synchronized with Thorm IR (B3 pending)
4. ✅ DOM element identity is preserved during edits (B3 pending)
5. ✅ Formatting commands work within paragraph boundaries (C pending)
6. ✅ Local history allows undo/redo (D pending)
7. ✅ Input is sanitized according to policy (E1 pending)
8. ✅ PageCraft adapters are functional (E3 pending)
9. ✅ Documentation and examples are complete (F pending)

### Completed in This Session (2026-10-27):
- ✅ A1: Visible Host example working (A1_InertHost.php)
- ✅ A2: Editor helper class created (Editor.php)
- ✅ Phase 0: All preparation tasks completed
- ✅ PSR-4 autoloading configured for Thorm\Editor namespaces

---

## Notes

- Each increment must be manually tested before proceeding
- No speculative abstractions — add only when needed
- Maintain backward compatibility with existing Thorm features
- Document architectural deviations in Architecture Decision Records (ADRs)
- Keep implementations simple and inspectable
- Never silently change the architecture to a second document model
