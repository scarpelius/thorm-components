# Phase 3: Milestone C — Formatting and Structure

## Overview
Add formatting capabilities (bold, italic, links) and basic structural operations (paragraph separation, undo/redo). Each task is a separate manual review checkpoint.

## Tasks

### Task C1: Bold and Italic Formatting
**Objective**: Apply inline formatting to selected text ranges

**Description**: Implement basic text formatting (Bold, Italic) that works across text node boundaries.

**Subtasks**:

1. **Add Formatting Toolbar** (minimal)
   - File: `src/Editor/Editor.php`
   - Add `showFormattingControls` configuration (default: true)
   - Add formatting button generation methods:
     - `formattingButtonBold()`
     - `formattingButtonItalic()`
     - `formattingButtonLink()`

2. **Implement Selection Handling**
   - File: `src/assets/thorm-editor.js`
   - Get current selection using `window.getSelection()`
   - Handle collapsed (caret) and ranged selections
   - Store selection for reuse after formatting

3. **Apply Formatting Commands**
   - File: `src/Editor/Edit/FormatCommand.php`
   - `toggleBold()` - wrap in `<strong>` or remove
   - `toggleItalic()` - wrap in `<em>` or remove
   - Handle partial selections across text nodes
   - Merge adjacen

## Phase 3: Milestone C — Formatting and Structure

## Overview
Add formatting capabilities (bold, italic, links) and basic structural operations (paragraph separation, undo/redo). Each task is a separate manual review checkpoint.

## Tasks

### Task C1: Bold and Italic Formatting
**Objective**: Apply inline formatting to selected text ranges

**Description**: Implement basic text formatting (Bold, Italic) that works across text node boundaries.

**Subtasks**:

1. **Add Formatting Toolbar** (minimal)
   - File: `src/Editor/Editor.php`
   - Add `showFormattingControls` configuration (default: true)
   - Add formatting button generation methods:
     - `formattingButtonBold()`
     - `formattingButtonItalic()`
     - `formattingButtonLink()`

2. **Implement Selection Handling**
   - File: `src/assets/thorm-editor.js`
   - Get current selection using `window.getSelection()`
   - Handle collapsed (caret) and ranged selections
   - Store selection for reuse after formatting

3. **Apply Formatting Commands**
   - File: `src/Editor/Edit/FormatCommand.php`
   - `toggleBold()` - wrap in `<strong>` or remove
   - `toggleItalic()` - wrap in `<em>` or remove
   - Handle partial selections across text node boundaries

4. **Add Toolbar UI**
   - File: `src/assets/thorm-editor.js`
   - Create floating toolbar that appears when editing
   - Position toolbar above editor
   - Hide toolbar when editing finishes

5. **Update Example**
   - File: `src/Editor/Examples/C1_Formatting.php`
   - Create editable paragraph with some text
   - Apply bold/italic to selections
   - Verify formatting persists

**Implementation Details**:

```php
// src/Editor/Editor.php - Add formatting controls
public static function withFormattingToolbar(ElNode $node, array $config = []): array {
    $showToolbar = $config['showFormattingControls'] ?? true;
    $position = $config['toolbarPosition'] ?? 'top';
    
    if (!$showToolbar) {
        return [$node, null];
    }
    
    $toolbar = el('div', [['cls', 'thorm-editor-toolbar']], [
        el('button', [['cls', 'thorm-editor-btn-bold']], [text('B')]),
        el('button', [['cls', 'thorm-editor-btn-italic']], [text('I')]),
        el('button', [['cls', 'thorm-editor-btn-underline']], [text('U')]),
        el('button', [['cls', 'thorm-editor-btn-link']], [text('Link')]),
    ]);
    
    $wrapperChildren = $node->children;
    
    if ($position === 'top') {
        array_unshift($wrapperChildren, $toolbar);
    } else {
        $wrapperChildren[] = $toolbar;
    }
    
    return [
        el($node->tag, $node->props, $wrapperChildren),
        $toolbar
    ];
}
```

```javascript
// src/assets/thorm-editor.js - Add formatting
window.ThormEditor = (function() {
    'use strict';
    
    const ThormEditor = {};
    
    // Get current selection
    ThormEditor.getCurrentSelection = function() {
        return window.getSelection();
    };
    
    // Toggle bold
    ThormEditor.toggleBold = function() {
        document(execCommand('bold', false, null));
    };
    
    // Toggle italic
    ThormEditor.toggleItalic = function() {
        document(execCommand('italic', false, null));
    };
    
    // Toggle underline
    ThormEditor.toggleUnderline = function() {
        document(execCommand('underline', false, null));
    };
    
    return ThormEditor;
})();
```

**Manual Acceptance Checklist**:
- [ ] Select text range; apply bold
- [ ] Apply italic to same or different range
- [ ] Toggle off formatting (should remove)
- [ ] Partial selections work correctly
- [ ] No unexpected wrapper elements added

**Files to Change**:
- `src/Editor/Editor.php` (add formatting controls)
- `src/Editor/Edit/FormatCommand.php` (new)
- `src/assets/thorm-editor.js` (add formatting logic)
- `src/Editor/Examples/C1_Formatting.php` (new)

---

### Task C2: Link Formatting
**Objective**: Add hyperlink support to text selections

**Description**: Implement link formatting that prompts for URL and creates `<a>` elements.

**Subtasks**:

1. **Add Link Button**
   - File: `src/Editor/Editor.php`
   - Add link button to formatting toolbar
   - Add `linkConfig` option (allowed protocols, etc.)

2. **Implement Link Dialog/Interaction**
   - File: `src/assets/thorm-editor.js`
   - Prompt for URL when link button clicked
   - Handle URL validation
   - Create/modify `<a>` element around selection

3. **Add Link UI**
   - File: `src/assets/thorm-editor.js`
   - Show existing link on selection
   - Allow removing link

4. **Update Example**
   - File: `src/Editor/Examples/C2_Links.php`
   - Select text, apply link
   - Enter URL, verify link created
   - Remove link, verify text restored

**Manual Acceptance Checklist**:
- [ ] Select text; click link button
- [ ] Enter valid URL; verify link created
- [ ] Invalid URL rejected (if validation added)
- [ ] Remove link; text is restored
- [ ] Nested formatting preserved

**Files to Change**:
- `src/Editor/Editor.php` (add link button)
- `src/assets/thorm-editor.js` (add link logic)
- `src/Editor/Examples/C2_Links.php` (new)

---

### Task C3: Paragraph Separation (Enter key)
**Objective**: Handle Enter key to create new paragraphs

**Description**: Intercept Enter key in contenteditable to create proper `<p>` elements instead of `<br>` tags.

**Subtasks**:

1. **Intercept Enter Key**
   - File: `src/assets/thorm-editor.js`
   - Add keydown listener for Enter key
   - Prevent default behavior
   - Insert paragraph break instead

2. **Implement Paragraph Break**
   - File: `src/Editor/Edit/StructureEditor.php`
   - `insertParagraphBreak()` method
   - Handle edge cases (caret at start/end of element)
   - Create new `<p>` element with cursor positioned

3. **Handle Backspace/Delete**
   - File: `src/assets/thorm-editor.js`
   - HandleBackspace at paragraph boundaries
   - Handle delete at paragraph boundaries
   - Merge paragraphs when appropriate

4. **Update Example**
   - File: `src/Editor/Examples/C3_Paragraphs.php`
   - Type text, press Enter
   - Verify new paragraph created
   - Multiple paragraphs visible as separate blocks

**Manual Acceptance Checklist**:
- [ ] Press Enter; new paragraph created
- [ ] Each paragraph is separate `<p>` element
- [ ] Caret positions correctly in new paragraph
- [ ] Backspace at paragraph boundary merges correctly
- [ ] Delete at paragraph boundary merges correctly

**Files to Change**:
- `src/assets/thorm-editor.js` (add key handlers)
- `src/Editor/Edit/StructureEditor.php` (new)
- `src/Editor/Examples/C3_Paragraphs.php` (new)

---

### Task C4: Undo/Redo History
**Objective**: Provide local undo/redo for editing operations

**Description**: Implement basic undo/redo using transaction log pattern.

**Subtasks**:

1. **Implement Transaction Log**
   - File: `src/Editor/Edit/History.php`
   - `Transaction` class to capture state
   - `History` class to manage stack
   - `undo()` and `redo()` methods

2. **Capture Changes**
   - File: `src/assets/thorm-editor.js`
   - Log state before significant changes
   - Log undo/redo on formatting, typing, etc.
   - Limit history depth (e.g., 50 transactions)

3. **Add Undo/Redo Buttons**
   - File: `src/Editor/Editor.php`
   - Add undo/redo buttons to toolbar
   - Optional: keyboard shortcuts (Ctrl+Z, Ctrl+Y)

4. **Update Example**
   - File: `src/Editor/Examples/C4_History.php`
   - Make several edits
   - Press undo; verify state restored
   - Press redo; verify state restored
   - Verify selection preserved

**Implementation Details**:

```php
// src/Editor/Edit/History.php
class History {
    private array $undoStack = [];
    private array $redoStack = [];
    private int $maxSize = 50;
    
    public function capture(ElNode $state): void {
        $this->undoStack[] = $state;
        $this->redoStack = []; // Clear redo on new action
        if (count($this->undoStack) > $this->maxSize) {
            array_shift($this->undoStack);
        }
    }
    
    public function undo(?ElNode $current): ?ElNode {
        if (empty($this->undoStack)) {
            return null;
        }
        $previous = array_pop($this->undoStack);
        $this->redoStack[] = $current;
        return $previous;
    }
    
    public function redo(?ElNode $current): ?ElNode {
        if (empty($this->redoStack)) {
            return null;
        }
        $next = array_pop($this->redoStack);
        $this->undoStack[] = $current;
        return $next;
    }
    
    public function canUndo(): bool {
        return !empty($this->undoStack);
    }
    
    public function canRedo(): bool {
        return !empty($this->redoStack);
    }
}
```

```javascript
// src/assets/thorm-editor.js - Add undo/redo
function captureState() {
    if (!activeElement) return;
    
    const state = {
        html: activeElement.innerHTML,
        selection: getSelectionState(),
        timestamp: Date.now()
    };
    
    history.undoStack.push(state);
    history.redoStack = [];
    
    if (history.undoStack.length > 50) {
        history.undoStack.shift();
    }
}

function undo() {
    if (history.undoStack.length === 0) return;
    
    const previous = history.undoStack.pop();
    history.redoStack.push({
        html: activeElement.innerHTML,
        selection: getSelectionState()
    });
    
    activeElement.innerHTML = previous.html;
    restoreSelection(previous.selection);
}

function redo() {
    if (history.redoStack.length === 0) return;
    
    const next = history.redoStack.pop();
    history.undoStack.push({
        html: activeElement.innerHTML,
        selection: getSelectionState()
    });
    
    activeElement.innerHTML = next.html;
    restoreSelection(next.selection);
}

window.ThormEditor.undo = undo;
window.ThormEditor.redo = redo;
```

**Manual Acceptance Checklist**:
- [ ] Make several edits
- [ ] Press undo; state restored
- [ ] Press redo; state restored
- [ ] Selection preserved after undo/redo
- [ ] History has reasonable size limit

**Files to Change**:
- `src/Editor/Edit/History.php` (new)
- `src/assets/thorm-editor.js` (add undo/redo logic)
- `src/Editor/Examples/C4_History.php` (new)

---

### Task C5: List Formatting (Optional)
**Objective**: Add support for ordered and unordered lists

**Description**: Implement list formatting for creating bullet/numbered lists from text selections.

**Subtasks**:

1. **Add List Buttons**
   - File: `src/Editor/Editor.php`
   - Add unordered list button
   - Add ordered list button

2. **Implement List Creation**
   - File: `src/Editor/Edit/ListEditor.php`
   - `toggleUnorderedList()` - wrap in `<ul><li>`
   - `toggleOrderedList()` - wrap in `<ol><li>`
   - Handle existing list structure

3. **Update Example**
   - File: `src/Editor/Examples/C5_Lists.php`
   - Create list from text selection
   - Convert between ordered/unordered
   - Remove list formatting

**Manual Acceptance Checklist**:
- [ ] Select multiple lines; apply unordered list
- [ ] Apply ordered list
- [ ] Remove list formatting
- [ ] Nested lists work correctly

**Files to Change**:
- `src/Editor/Editor.php` (add list buttons)
- `src/Editor/Edit/ListEditor.php` (new)
- `src/Editor/Examples/C5_Lists.php` (new)

---

## Summary
Each task in Milestone C is a separate manual review checkpoint. Implement formatting incrementally, starting with basic bold/italic and progressing to more complex features.

---

## Next Steps
After Milestone C completion, proceed to Milestone D (IR Synchronization and Normalization)
