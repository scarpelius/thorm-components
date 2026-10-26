# Phase 5: Milestone E — Advanced Features and Optimization

## Overview
Add advanced editing features, performance optimizations, and comprehensive testing.

## Tasks

### Task E1: Multi-Block Operations
**Objective**: Support operations that affect multiple blocks simultaneously

**Description**: Implement选中多个块并进行批量操作的能力(如批量删除、格式化).

**Subtasks**:

1. **Add Block Selection**
   - File: `src/Editor/Select/BlockSelector.php`
   - Click+drag to select multiple blocks
   - Shift+click to extend selection
   - Display selection indicators

2. **Create Block Selection Manager**
   - File: `src/Editor/Select/SelectionManager.php`
   - Track selected block IDs
   - Provide selection boundary information
   - Deselect on outside click

3. **Implement Batch Operations**
   - File: `src/Editor/Operations/BatchOperations.php`
   - `deleteBlocks(array $ids)`
   - `applyFormatToSelected(string $format, array $config)`
   - `moveBlocks(array $ids, string $direction)`

4. **Update Example**
   - File: `src/Editor/Examples/E1_MultiBlock.php`
   - Select multiple blocks
   - Delete blocks
   - Format all selected

**Manual Acceptance Checklist**:
- [ ] Click+drag selects multiple blocks
- [ ] Shift+click extends selection
- [ ] Batch delete works correctly
- [ ] Batch format applies to all selected

**Files to Change**:
- `src/Editor/Select/BlockSelector.php` (new)
- `src/Editor/Select/SelectionManager.php` (new)
- `src/Editor/Operations/BatchOperations.php` (new)
- `src/Editor/Examples/E1_MultiBlock.php` (new)

---

### Task E2: Drag and Drop
**Objective**: Reorder blocks via drag and drop

**Description**: Implement drag and drop for reordering blocks within a document.

**Subtasks**:

1. **Add Drag and Drop Handler**
   - File: `src/Editor/DragDrop/DragDropHandler.php`
   - Start drag on mouse down
   - Update selection on drag
   - Drop to reorder

2. **Implement Reorder Operation**
   - File: `src/Editor/Operations/Reorder.php`
   - `reorderBlock(string $blockId, string $targetId, string $position)`
   - Update IR to reflect new order
   - Update DOM without remounting

3. **Add Visual Feedback**
   - File: `src/assets/thorm-editor.js`
   - Drag ghost element
   - Drop target highlights
   - Revert on cancel

4. **Update Example**
   - File: `src/Editor/Examples/E2_DragDrop.php`
   - Drag blocks to reorder
   - Verify IR order matches visual order

**Manual Acceptance Checklist**:
- [ ] Drag blocks works correctly
- [ ] Drop target shows highlight
- [ ] Reorder persists after drop
- [ ] IR and DOM stay synchronized

**Files to Change**:
- `src/Editor/DragDrop/DragDropHandler.php` (new)
- `src/Editor/Operations/Reorder.php` (new)
- `src/assets/thorm-editor.js` (add dragdrop logic)
- `src/Editor/Examples/E2_DragDrop.php` (new)

---

### Task E3: Spell Check and Language
**Objective**: Enable browser spell checking and language attributes

**Description**: Add support for spell checking and language-specific editing.

**Subtasks**:

1. **Add Language Configuration**
   - File: `src/Editor/Editor.php`
   - Add `language` config option
   - Set `lang` attribute on editor host

2. **Enable Spell Check**
   - File: `src/Editor/Editor.php`
   - Add `enableSpellCheck` config option (default: true)
   - Set `spellcheck` attribute on editable elements

3. **Add Dictionary Support**
   - File: `src/Editor/Dict/Dictionary.php`
   - Load dictionary from file
   - Check words against dictionary
   - Provide suggestions

4. **Update Example**
   - File: `src/Editor/Examples/E3_SpellCheck.php`
   - Type misspelled words
   - Verify spell check indicators
   - Change language and verify

**Manual Acceptance Checklist**:
- [ ] Spell check works in editable elements
- [ ] Language setting affects spell check
- [ ] No performance degradation

**Files to Change**:
- `src/Editor/Editor.php` (add language/spellcheck config)
- `src/Editor/Dict/Dictionary.php` (new)
- `src/Editor/Examples/E3_SpellCheck.php` (new)

---

### Task E4: Performance Optimization
**Objective**: Optimize for large documents and frequent edits

**Description**: Implement performance optimizations for the editor.

**Subtasks**:

1. **Add Virtual Scrolling**
   - File: `src/Editor/Optimize/VirtualScroll.php`
   - Render only visible blocks
   - Load additional blocks on scroll

2. **Implement Debouncing**
   - File: `src/Editor/Optimize/Debounce.php`
   - Debounce input events
   - Debounce save operations
   - Debounce sync operations

3. **Add Lazy Loading**
   - File: `src/Editor/Optimize/LazyLoader.php`
   - Load formattingplugins on use
   - Load advanced features on demand

4. **Update Example**
   - File: `src/Editor/Examples/E4_Performance.php`
   - Test with large document (100+ blocks)
   - Verify smooth performance

**Manual Acceptance Checklist**:
- [ ] Large documents load quickly
- [ ] Scrolling is smooth
- [ ] No performance degradation with many blocks

**Files to Change**:
- `src/Editor/Optimize/VirtualScroll.php` (new)
- `src/Editor/Optimize/Debounce.php` (new)
- `src/Editor/Optimize/LazyLoader.php` (new)
- `src/Editor/Examples/E4_Performance.php` (new)

---

### Task E5: Testing Suite
**Objective**: Create comprehensive test suite

**Description**: Implement unit tests and integration tests.

**Subtasks**:

1. **Create Test Infrastructure**
   - File: `tests/Editor/`
   - PHPUnit configuration
   - Test fixtures
   - Mock implementations

2. **Unit Tests**
   - File: `tests/Editor/Unit/`
   - Editor.php tests
   - TextEditor.php tests
   - History.php tests
   - Sanitizer.php tests

3. **Integration Tests**
   - File: `tests/Editor/Integration/`
   - Full editing workflow
   - IR-DOM synchronization
   - Persistence round trips

4. **Update Example**
   - File: `tests/Editor/Integration/E5_Integration.php`
   - End-to-end test of features

**Manual Acceptance Checklist**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Tests cover edge cases

**Files to Change**:
- `tests/Editor/` (new)
- `tests/Editor/Unit/` (new)
- `tests/Editor/Integration/` (new)
- `phpunit.xml` (new or update)

---

### Task E6: Documentation
**Objective**: Complete documentation for the editor

**Description**: Write comprehensive documentation for developers and users.

**Subtasks**:

1. **Developer Documentation**
   - File: `docs/developer.md`
   - Architecture overview
   - Extending the editor
   - Contributing guidelines

2. **User Documentation**
   - File: `docs/user.md`
   - Getting started
   - Formatting guide
   - Troubleshooting

3. **API Documentation**
   - File: `docs/api/`
   - PHP API reference
   - JavaScript API reference
   - Event documentation

4. **Examples**
   - File: `docs/examples/`
   - Basic examples
   - Advanced examples
   - Integration examples

**Manual Acceptance Checklist**:
- [ ] Developer docs complete
- [ ] User docs complete
- [ ] API docs complete
- [ ] Examples working

**Files to Change**:
- `docs/developer.md` (new)
- `docs/user.md` (new)
- `docs/api/` (new)
- `docs/examples/` (new)

---

## Summary
Each task in Milestone E is a separate manual review checkpoint. These tasks add advanced features that should be thoroughly tested and optimized.

---

## Next Steps
After Milestone E completion, the Thorm Editor implementation is complete and ready for production use.
