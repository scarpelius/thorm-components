# Phase 1: Milestone A — First Visible Editor (No Editing Functionality)

## Overview
Create a recognizable but inert editor area that renders as ordinary HTML. No JavaScript or editing functionality required.

## Tasks

### Task A1: Visible Host (Inert Editor Area)
**Objective**: Create a simple editor host that renders as static HTML

**Description**: Create the simplest possible editor host using existing Thorm helpers. No JavaScript, no interactivity, just a labeled container with sample content.

**Subtasks**:

1. **Create PHP Example**
   - File: `src/Editor/Examples/A1_InertHost.php`
   - Use existing helpers: `el()`, `text()`, `fragment()`, `h1()`, `p()`
   - Create editor host container with CSS class `thorm-editor-host`
   - Add sample content (h1 + 2-3 paragraphs)
   - Add CSS class `thorm-editor-label` to identify as editor
   - Use minimal CSS (border, background, label)

2. **Create Example Template**
   - File: `public/editor-inert-host.html`
   - Simple HTML page that includes the editor host
   - Basic CSS to make the editor region visually distinct
   - No JavaScript required

**Implementation Details**:

```php
// src/Editor/Examples/A1_InertHost.php
use function Thorm\{h1, p, text, fragment};
use Thorm\Render;
use Thorm\BuildExample;

// Editor host with sample content
$editorHost = el('article', [
    ['cls', 'thorm-editor-host'],
    ['attrs', ['data-type' => 'editor-host']],
], [
    el('h2', [['cls', 'thorm-editor-label']], [text('Thorm Editor Test')]),
    p([], [text('This is a sample paragraph for testing the editor.')]),
    p([], [text('This editor host renders as ordinary HTML.')]),
]);

$app = fragment([$editorHost]);
```

**Style Requirements**:
```css
.thorm-editor-host {
    border: 2px dashed #666;
    padding: 16px;
    margin: 16px 0;
    background: #fafafa;
}

.thorm-editor-label {
    background: #666;
    color: white;
    padding: 4px 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 12px;
}
```

**Manual Acceptance Checklist**:
- [ ] Visit `http://localhost/editor-inert-host` (via PHP runner)
- [ ] See labeled editor region with sample content
- [ ] Content remains after refresh (no state)
- [ ] DOM inspection shows ordinary HTML elements
- [ ] Content is NOT editable (no cursor on click)

**Files to Change**:
- `src/Editor/Examples/A1_InertHost.php` (new)
- `public/editor-inert-host.html` (new)

---

### Task A2: PHP-Facing Editor Declaration
**Objective**: Wrap the editor host in a reusable PHP helper/facade

**Description**: Create an `Editor` helper that can be used instead of raw markup. Should return normal Thorm IR, not a new document model.

**Subtasks**:

1. **Create Editor Helper Class**
   - File: `src/Editor/Editor.php`
   - Return normal Thorm IR (ElNode)
   - Accept child IR nodes as content
   - Accept minimal configuration (optional):
     - `id`: DOM element ID
     - `class`: Additional CSS classes
     - `label`: Editor label text
     - `attributes`: Additional HTML attributes
   - Avoid coupling to PageCraft
   - Keep simple, not over-engineered

2. **Update Example**
   - File: `src/Editor/Examples/A2_WithHelper.php`
   - Use new `Editor` helper instead of raw markup
   - Verify identical DOM output to A1

**Implementation Details**:

```php
// src/Editor/Editor.php
class Editor {
    public static function host(array $children, array $config = []): ElNode {
        $classes = ['thorm-editor-host'];
        if (!empty($config['class'])) {
            $classes[] = $config['class'];
        }
        
        $attrs = [];
        if (!empty($config['id'])) {
            $attrs['id'] = $config['id'];
        }
        
        // Get label or default
        $label = $config['label'] ?? 'Editor';
        
        // Build children with label
        $hostChildren = [];
        if (!empty($label)) {
            $hostChildren[] = el('h2', [['cls', 'thorm-editor-label']], [text($label)]);
        }
        
        // Add sample content if no children provided
        if (empty($children)) {
            $children = [
                p([], [text('Sample paragraph content.')]),
            ];
        }
        
        $hostChildren[] = fragment($children);
        
        return el('article', [
            ['cls', implode(' ', $classes)],
            ['attrs', $attrs],
        ], $hostChildren);
    }
}
```

**Manual Acceptance Checklist**:
- [ ] Same visual output as A1
- [ ] DOM structure matches A1
- [ ] Helper can be temporarily removed without breaking fallback
- [ ] Existing Thorm pages still work

**Files to Change**:
- `src/Editor/Editor.php` (new)
- `src/Editor/Examples/A2_WithHelper.php` (new)

---

### Task A3: JS Extension Attachment
**Objective**: Attach harmless JavaScript initialization to the editor host

**Description**: Create minimal JavaScript extension that attaches to editor hosts without modifying existing Thorm runtime.

**Subtasks**:

1. **Create JavaScript Entrypoint**
   - File: `src/assets/thorm-editor.js` (or similar)
   - Mount/dispose pattern
   - Identify editor hosts by CSS class `thorm-editor-host`
   - Add harmless indicator (e.g., CSS class `thorm-editor-initialized`)

2. **Create Extension Registry** (if needed)
   - File: `src/Editor/Extension.php`
   - Register extension with Thorm runtime
   - Add minimal preboot registration if hook exists
   - Fallback if no hook exists: inline script in template

3. **Update Example**
   - Include the JS extension
   - Verify indicator appears once per host
   - Verify no duplicate initialization on refresh

**Implementation Details**:

```javascript
// assets/thorm-editor.js
window.ThormEditor = (function() {
    'use strict';
    
    let initialized = false;
    
    function initialize() {
        if (initialized) return;
        initialized = true;
        
        // Find all editor hosts
        const hosts = document.querySelectorAll('.thorm-editor-host');
        
        hosts.forEach(host => {
            // Add indicator class
            host.classList.add('thorm-editor-initialized');
            
            // Add any future event listeners here
            // For now, just mark as initialized
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Expose for manual testing
    return {
        initialize: initialize
    };
})();
```

**Manual Acceptance Checklist**:
- [ ] Indicator appears once per editor host
- [ ] Repeat load shows no duplicate initialization/listeners
- [ ] Other Thorm pages still work without the editor
- [ ] No errors in browser console

**Files to Change**:
- `src/assets/thorm-editor.js` (new)
- `src/Editor/Extension.php` (possible new)
- `public/index/index.html` template (update to include script)

---

## Summary
This phase delivers a working, inert editor host that displays as regular HTML. The editor is not interactive and has no editing capabilities. Each increment must be manually verified before proceeding.

---

## Next Steps
After Milestone A completion, proceed to Milestone B (Basic In-Place Editing)
