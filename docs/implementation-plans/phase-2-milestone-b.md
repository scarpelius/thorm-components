# Phase 2: Milestone B — Basic In-Place Editing

## Overview
Enable in-place editing of elements using `contenteditable` while preserving DOM element identity. Each task is a separate manual review checkpoint.

## Tasks

### Task B1: Activate One Element
**Objective**: Clicking a designated element makes that same DOM element editable

**Description**: Implement click handler that sets `contenteditable="true"` on the existing DOM element without re-rendering.

**Subtasks**:

1. **Add Activation Configuration**
   - File: `src/Editor/Editor.php`
   - Add `editable` option (boolean or selector)
   - Add IR metadata to mark editable nodes:
     - `data-thorm-editor="editable"`
     - Optional: `data-thorm-edit-mode="static"` for initial state

2. **Implement Click Handler**
   - File: `src/assets/thorm-editor.js`
   - Add click event listener on editable elements
   - Set `contenteditable="true"` on the element
   - Ensure no DOM replacement occurs
   - Store reference to original IR node

3. **Update Example**
   - File: `src/Editor/Examples/B1_ActivateOne.php`
   - Mark one paragraph as editable
   - Leave others as static
   - Include debug output to show element identity

**Implementation Details**:

```php
// src/Editor/Editor.php - Add to Editor class
public static function activateWhenClicked(ElNode $node): ElNode {
    // Add metadata attribute
    $newProps = $node->props;
    
    // Add data attribute if not present
    $hasAttr = false;
    foreach ($newProps as $prop) {
        if (is_array($prop) && $prop[0] === 'attrs' && isset($prop[1]['data-thorm-editor'])) {
            $hasAttr = true;
            break;
        }
    }
    
    if (!$hasAttr) {
        $newProps[] = ['attrs', ['data-thorm-editor' => 'editable']];
    }
    
    // Return cloned node with new props
    return new ElNode(
        $node->tag,
        $newProps,
        $node->children,
        $node->render
    );
}
```

```javascript
// src/assets/thorm-editor.js - Add activation handler
function makeElementEditable(element) {
    if (element.getAttribute('contenteditable') === 'true') {
        return; // Already editable
    }
    
    // Store original data
    element.dataset.previousContentEditable = 
        element.getAttribute('contenteditable') || 'inherit';
    
    // Enable editing
    element.contentEditable = 'true';
    element.classList.add('thorm-editor-active');
    
    // Focus the element
    element.focus();
    
    // Fire custom event for future hooks
    element.dispatchEvent(new CustomEvent('thorm-editor.activate', {
        bubbles: true,
        detail: { element: element }
    }));
}

// Click handler for all editable elements
document.addEventListener('click', function(e) {
    const editable = e.target.closest('[data-thorm-editor="editable"]');
    if (editable && !e.target.closest('.thorm-editor-toolbar')) {
        makeElementEditable(editable);
        e.preventDefault();
    }
});
```

**Manual Acceptance Checklist**:
- [ ] Click editable paragraph; caret appears
- [ ] Compare DOM element reference before/after activation (should be same)
- [ ] Other paragraphs remain plain HTML (not editable)
- [ ] Type text; it persists while focused
- [ ] No remount or DOM replacement occurs

**Files to Change**:
- `src/Editor/Editor.php` (add activation methods)
- `src/assets/thorm-editor.js` (add click handler)
- `src/Editor/Examples/B1_ActivateOne.php` (new)

---

### Task B2: Deactivate Editing
**Objective**: Explicit Finish/Done action returns element to ordinary HTML

**Description**: Add explicit finish control that removes `contenteditable` state and safely cleans up listeners/focus.

**Subtasks**:

1. **Declare Finish Control**
   - File: `src/Editor/Editor.php`
   - Add optional `showFinishControl` configuration (default: false)
   - Add `finishControl` method to generate finish button
   - Add finish button position config (top/bottom)

2. **Implement Deactivation Logic**
   - File: `src/assets/thorm-editor.js`
   - Remove `contenteditable="true"` from element
   - Remove activation state class
   - Restore original contenteditable value
   - Safely clean up any temporary state

3. **Update Example**
   - File: `src/Editor/Examples/B2_WithFinish.php`
   - Enable finish control
   - Type text, click finish, verify state
   - Refresh page and verify state is reset (expected)

**Implementation Details**:

```php
// src/Editor/Editor.php - Add finish control methods
public static function withFinishControl(ElNode $node, array $config = []): array {
    $showFinish = $config['showFinishControl'] ?? false;
    $finishPosition = $config['finishPosition'] ?? 'bottom';
    
    $finishButton = el('button', [
        ['cls', 'thorm-editor-finish'],
        ['attrs', ['type' => 'button']],
        ['on', 'click', 'ThormEditor.deactivateActive()'],
    ], [text('Finish Editing')]);
    
    $wrapperChildren = $node->children;
    
    if ($finishPosition === 'top' && $showFinish) {
        array_unshift($wrapperChildren, $finishButton);
    } elseif ($finishPosition === 'bottom' && $showFinish) {
        $wrapperChildren[] = $finishButton;
    }
    
    return [
        el($node->tag, $node->props, $wrapperChildren),
        $finishButton
    ];
}
```

```javascript
// src/assets/thorm-editor.js - Add deactivation
function deactivateActive() {
    const active = document.querySelector('[contenteditable="true"]');
    if (!active) return;
    
    // Restore previous state
    const previous = active.dataset.previousContentEditable;
    if (previous === 'inherit' || previous === 'null') {
        active.removeAttribute('contenteditable');
    } else {
        active.setAttribute('contenteditable', previous);
    }
    
    active.classList.remove('thorm-editor-active');
    delete active.dataset.previousContentEditable;
    
    // Fire event
    active.dispatchEvent(new CustomEvent('thorm-editor.deactivate', {
        bubbles: true,
        detail: { element: active }
    }));
}

// Expose for button click handler
window.ThormEditor.deactivate = deactivateActive;

// Also allow Escape key to deactivate
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        deactivateActive();
    }
});
```

**Manual Acceptance Checklist**:
- [ ] Type text in editable element
- [ ] Click Finish button
- [ ] Confirm HTML remains visible (text is still there)
- [ ] No active caret (not editable)
- [ ] No remount occurs
- [ ] Refresh resets to initial state (expected)

**Files to Change**:
- `src/Editor/Editor.php` (add finish control)
- `src/assets/thorm-editor.js` (add deactivation logic)
- `src/Editor/Examples/B2_WithFinish.php` (new)

---

### Task B3: Configurable Block Identity
**Objective**: Active element shows its identity using PageCraft-compatible attributes

**Description**: Implement configurable `data-id` and `data-type` attributes that persist on elements.

**Subtasks**:

1. **Accept Configurable Identity**
   - File: `src/Editor/Editor.php`
   - Accept `dataId` configuration (integer)
   - Accept `dataType` configuration (string)
   - Generate normal IR attributes for these

2. **Add Identity Reading/Lookup**
   - File: `src/assets/thorm-editor.js`
   - Read identity attributes from elements
   - Store identity in memory for use during editing
   - Keep runtime-only addressing separate

3. **Add Debug Inspector** (optional)
   - File: `src/assets/thorm-editor-debug.js`
   - Simple inspector that shows identity on hover/focus
   - Display in a small tooltip or status bar

4. **Update Example**
   - File: `src/Editor/Examples/B3_WithIdentity.php`
   - Create two blocks with different IDs
   - Activate each and verify correct ID is shown

**Implementation Details**:

```php
// src/Editor/Editor.php - Add identity configuration
public static function block(int $id, string $type = 'block', array $children = [], array $config = []): ElNode {
    $attrs = $config['attrs'] ?? [];
    $attrs['data-thorm-block-id'] = (string)$id;
    $attrs['data-thorm-block-type'] = $type;
    
    $config['attrs'] = $attrs;
    
    return self::host($children, $config);
}

public static function getIdentity(ElNode $node): ?array {
    foreach ($node->props as $prop) {
        if (is_array($prop) && $prop[0] === 'attrs') {
            $attrs = $prop[1] ?? [];
            if (isset($attrs['data-thorm-block-id'])) {
                return [
                    'id' => (int)$attrs['data-thorm-block-id'],
                    'type' => $attrs['data-thorm-block-type'] ?? 'block',
                ];
            }
        }
    }
    return null;
}
```

```javascript
// src/assets/thorm-editor.js - Add identity management
function getBlockIdentity(element) {
    const id = element.dataset.thormBlockId;
    const type = element.dataset.thormBlockType || 'block';
    
    if (id === undefined) return null;
    
    return {
        id: parseInt(id, 10),
        type: type
    };
}

function getActiveBlockIdentity() {
    const active = document.querySelector('[contenteditable="true"]');
    if (!active) return null;
    return getBlockIdentity(active);
}

window.ThormEditor.getBlockIdentity = getBlockIdentity;
window.ThormEditor.getActiveBlockIdentity = getActiveBlockIdentity;
```

**Manual Acceptance Checklist**:
- [ ] Inspect exact DOM attributes (`data-thorm-block-id`, `data-thorm-block-type`)
- [ ] Activate block 1; verify ID is 1
- [ ] Activate block 2; verify ID is 2
- [ ] Identity correctly reported when editing

**Files to Change**:
- `src/Editor/Editor.php` (add identity methods)
- `src/assets/thorm-editor.js` (add identity management)
- `src/Editor/Examples/B3_WithIdentity.php` (new)

---

### Task B4: Read the Edited Value
**Objective**: Local status/preview displays latest text of active paragraph

**Description**: Implement input observer that captures text changes and exposes them via a preview/status location.

**Subtasks**:

1. **Declare Status Target**
   - File: `src/Editor/Editor.php`
   - Add optional `statusTarget` configuration
   - Could be a Thorm atom binding or simple DOM element selector

2. **Observe Input and Expose Text**
   - File: `src/assets/thorm-editor.js`
   - Add input event listener on editable elements
   - Extract current text content
   - Cleanup any HTML tags for plain text preview
   - Expose via event or function call

3. **Update Example**
   - File: `src/Editor/Examples/B4_WithStatus.php`
   - Type text and watch status change
   - Finish and re-enter; verify latest visible text is preserved

**Implementation Details**:

```javascript
// src/assets/thorm-editor.js - Add text observation
let activeElement = null;
let textUpdateCallback = null;

function startObserving(element, callback) {
    if (activeElement) {
        activeElement.removeEventListener('input', handleInput);
    }
    
    activeElement = element;
    textUpdateCallback = callback;
    
    element.addEventListener('input', handleInput);
}

function handleInput() {
    if (!activeElement || !textUpdateCallback) return;
    
    // Get plain text (cleanup HTML)
    const textContent = activeElement.textContent || '';
    
    textUpdateCallback(textContent, activeElement);
}

function stopObserving() {
    if (activeElement) {
        activeElement.removeEventListener('input', handleInput);
        activeElement = null;
    }
    textUpdateCallback = null;
}

window.ThormEditor.observeText = startObserving;
window.ThormEditor.stopObserving = stopObserving;
```

**Manual Acceptance Checklist**:
- [ ] Type text and watch status change
- [ ] Finish editing; text remains visible in preview
- [ ] Re-enter editing; text is preserved
- [ ] No HTML tags in plain text preview

**Files to Change**:
- `src/Editor/Editor.php` (add status configuration)
- `src/assets/thorm-editor.js` (add observation logic)
- `src/Editor/Examples/B4_WithStatus.php` (new)

---

### Task B5: First IR-Synchronized Text Edit
**Objective**: Text changes are reflected in the corresponding live Thorm IR

**Description**: Implement narrowly scoped text edit operation that updates Thorm IR without replacing the paragraph DOM node.

**Subtasks**:

1. **Validate IR Shape**
   - File: `src/Editor/IRUtils.php`
   - Validate PHP-origin IR shape used by examples
   - Add round-trip check if PHP input/output involved
   - Ensure text nodes can be extracted/replaced

2. **Implement Text Edit Operation**
   - File: `src/Editor/Edit/TextEditor.php`
   - Narrowly scoped text edit operation:
     - Get current text content from DOM
     - Update corresponding text node in IR
     - Trigger Thorm IR update
   - Ensure mount bookkeeping remains consistent
   - Do not generalize to every edit yet

3. **Update Example**
   - File: `src/Editor/Examples/B5_WithIRSync.php`
   - Type a simple text change
   - Inspect IR debug view and DOM text
   - Verify equality, stable element identity

**Implementation Details**:

```php
// src/Editor/Edit/TextEditor.php
class TextEditor {
    /**
     * Update text content in an IR node
     */
    public static function update(ElNode $node, string $newText): ElNode {
        $textNode = self::findTextNode($node);
        
        if ($textNode) {
            // Replace the text node
            $children = [];
            foreach ($node->children as $child) {
                if ($child === $textNode) {
                    $children[] = new TextNode($newText);
                } else {
                    $children[] = $child;
                }
            }
            
            return new ElNode(
                $node->tag,
                $node->props,
                $children,
                $node->render
            );
        } else {
            // No existing text node, add one
            $children = array_merge(
                $node->children,
                [new TextNode($newText)]
            );
            
            return new ElNode(
                $node->tag,
                $node->props,
                $children,
                $node->render
            );
        }
    }
    
    private static function findTextNode(ElNode $node): ?TextNode {
        foreach ($node->children as $child) {
            if ($child instanceof TextNode) {
                return $child;
            }
            if ($child instanceof FragmentNode) {
                foreach ($child->children as $subchild) {
                    if ($subchild instanceof TextNode) {
                        return $subchild;
                    }
                }
            }
        }
        return null;
    }
}
```

```javascript
// src/assets/thorm-editor.js - Add IR sync
function syncToIR(element) {
    const textContent = element.textContent || '';
    
    // Fire event with new content
    element.dispatchEvent(new CustomEvent('thorm-editor.sync', {
        bubbles: true,
        detail: {
            text: textContent,
            element: element
        }
    }));
}

window.ThormEditor.syncToIR = syncToIR;
```

**Manual Acceptance Checklist**:
- [ ] Type a simple text change
- [ ] Inspect IR debug view (if available) and DOM text
- [ ] Verify equality of content
- [ ] Verify stable element identity (no remount)
- [ ] No unexpected overwrites occur

**Files to Change**:
- `src/Editor/IRUtils.php` (new - IR validation utilities)
- `src/Editor/Edit/TextEditor.php` (new - text editing logic)
- `src/assets/thorm-editor.js` (add sync logic)
- `src/Editor/Examples/B5_WithIRSync.php` (new)

---

## Summary
Each task in Milestone B is a separate manual review checkpoint. Implement exactly one small, manually verifiable vertical slice at a time. Stop after each for maintainer review.

---

## Next Steps
After Milestone B completion, proceed to Milestone C (Formatting and Structure)
