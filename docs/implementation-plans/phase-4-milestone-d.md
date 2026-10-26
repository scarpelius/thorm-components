# Phase 4: Milestone D — Production-Ready Infrastructure

## Overview
Add production infrastructure: sanitization, persistence, toolbar architecture, and robust IR synchronization.

## Tasks

### Task D1: HTML Sanitization
**Objective**: Sanitize all imported and edited HTML according to extensible policy

**Description**: Implement HTML sanitization to prevent XSS and ensure valid markup.

**Subtasks**:

1. **Create Sanitizer Interface**
   - File: `src/Editor/Sanitize/SanitizerInterface.php`
   - `sanitize(string $html): string` method
   - Allow configuration of allowed tags/attributes

2. **Implement Basic Sanitizer**
   - File: `src/Editor/Sanitize/BasicSanitizer.php`
   - Remove script tags
   - Remove on* event attributes
   - Remove javascript: URLs
   - Remove style tags (unless in allowed list)
   - Normalize attribute quoting

3. **Add Sanitization Hooks**
   - File: `src/Editor/Edit/SanitizingEditor.php`
   - Sanitize before save
   - Sanitize after paste
   - Sanitize when loading from external sources

4. **Update Example**
   - File: `src/Editor/Examples/D1_Sanitized.php`
   - Test with malicious HTML (scripts, event handlers)
   - Verify sanitized output

**Implementation Details**:

```php
// src/Editor/Sanitize/SanitizerInterface.php
interface SanitizerInterface {
    public function sanitize(string $html): string;
    public function getAllowedTags(): array;
    public function setAllowedTags(array $tags): self;
    public function getAllowedAttributes(): array;
    public function setAllowedAttributes(array $attrs): self;
}

// src/Editor/Sanitize/BasicSanitizer.php
class BasicSanitizer implements SanitizerInterface {
    private array $allowedTags = ['a', 'b', 'em', 'i', 'strong', 'u', 'p', 'br', 'span'];
    private array $allowedAttributes = ['class', 'style', 'href', 'title'];
    
    public function sanitize(string $html): string {
        // Remove script tags and contents
        $html = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i', '', $html);
        
        // Remove on* attributes
        $html = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*\["\']/i', '', $html);
        $html = preg_replace('/\s+on\w+\s*=\s*[^\s>]+/i', '', $html);
        
        // Remove javascript: URLs
        $html = preg_replace('/href\s*=\s*["\']\s*javascript:[^"\']*["\']/i', 'href="#"', $html);
        
        // Remove style tags
        $html = preg_replace('/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/i', '', $html);
        
        // Remove disallowed tags
        $allowed = implode('|', array_map('preg_quote', $this->allowedTags));
        $html = preg_replace('/<\/?(?!' . $allowed . ')\b[^>]*>/i', '', $html);
        
        // Remove disallowed attributes
        foreach ($this->allowedAttributes as $attr) {
            $html = preg_replace('/\s+' . $attr . '\s*=\s*["\'][^"\']*\["\']/i', '', $html);
        }
        
        return trim($html);
    }
}
```

**Manual Acceptance Checklist**:
- [ ] Malicious HTML (scripts) removed
- [ ] Event attributes removed
- [ ] javascript: URLs converted
- [ ] Allowed tags preserved
- [ ] Allowed attributes preserved

**Files to Change**:
- `src/Editor/Sanitize/SanitizerInterface.php` (new)
- `src/Editor/Sanitize/BasicSanitizer.php` (new)
- `src/Editor/Edit/SanitizingEditor.php` (new)
- `src/Editor/Examples/D1_Sanitized.php` (new)

---

### Task D2: Toolbar Architecture
**Objective**: Design extensible toolbar system for formatting controls

**Description**: Create a toolbar manager that can dynamically add/remove controls.

**Subtasks**:

1. **Create Toolbar Manager**
   - File: `src/Editor/UI/ToolbarManager.php`
   - Register formatting controls
   - Manage toolbar visibility
   - Handle control events

2. **Implement Control Interface**
   - File: `src/Editor/UI/ToolbarControlInterface.php`
   - `render(): ElNode` - render control
   - `getEvents(): array` - register event handlers
   - `execute(): void` - execute control action

3. **Add Default Controls**
   - File: `src/Editor/UI/Controls/`
   - BoldControl, ItalicControl, UnderlineControl
   - LinkControl, UnlinkControl
   - UnorderedListControl, OrderedListControl
   - UndoControl, RedoControl

4. **Update Example**
   - File: `src/Editor/Examples/D2_Toolbar.php`
   - Create editable with toolbar
   - Add custom control
   - Verify all controls work

**Implementation Details**:

```php
// src/Editor/UI/ToolbarControlInterface.php
interface ToolbarControlInterface {
    public function render(): ElNode;
    public function getClientConfig(): array;
    public function getEvents(): array;
    public function getName(): string;
}

// src/Editor/UI/ToolbarManager.php
class ToolbarManager {
    private array $controls = [];
    private bool $visible = true;
    
    public function addControl(ToolbarControlInterface $control): self {
        $this->controls[$control->getName()] = $control;
        return $this;
    }
    
    public function removeControl(string $name): self {
        unset($this->controls[$name]);
        return $this;
    }
    
    public function getControls(): array {
        return $this->controls;
    }
    
    public function render(): ?ElNode {
        if (empty($this->controls)) {
            return null;
        }
        
        $childNodes = [];
        foreach ($this->controls as $control) {
            $childNodes[] = $control->render();
        }
        
        return el('div', [['cls', 'thorm-editor-toolbar']], $childNodes);
    }
    
    public function isVisible(): bool {
        return $this->visible;
    }
    
    public function hide(): self {
        $this->visible = false;
        return $this;
    }
    
    public function show(): self {
        $this->visible = true;
        return $this;
    }
}
```

**Manual Acceptance Checklist**:
- [ ] Toolbar renders correctly
- [ ] All controls functional
- [ ] Toolbar shows/hides appropriately
- [ ] Custom controls can be added

**Files to Change**:
- `src/Editor/UI/ToolbarManager.php` (new)
- `src/Editor/UI/ToolbarControlInterface.php` (new)
- `src/Editor/UI/Controls/` (new directory with controls)
- `src/Editor/Examples/D2_Toolbar.php` (new)

---

### Task D3: IR Synchronization
**Objective**: Robust IR-to-DOM and DOM-to-IR synchronization

**Description**: Implement reliable synchronization between Thorm IR and DOM state.

**Subtasks**:

1. **Create Sync Manager**
   - File: `src/Editor/Sync/SyncManager.php`
   - Track IR node references
   - Handle updates from DOM changes
   - Handle updates from IR changes

2. **Implement Diff Algorithm**
   - File: `src/Editor/Sync/Diff.php`
   - Compare current DOM with IR
   - Identify minimal changes needed
   - Apply changes without remounting

3. **Add Conflict Resolution**
   - File: `src/Editor/Sync/ConflictResolver.php`
   - Handle concurrent changes
   - Last-write-wins or merge strategy
   - Log conflicts for debugging

4. **Update Example**
   - File: `src/Editor/Examples/D3_Sync.php`
   - Make changes from both IR and DOM
   - Verify synchronization
   - No unexpected state loss

**Implementation Details**:

```php
// src/Editor/Sync/SyncManager.php
class SyncManager {
    private array $nodeMap = [];
    private ?callable $onChange = null;
    
    public function registerNode(ElNode $node, string $elementId): self {
        $this->nodeMap[$elementId] = $node;
        return $this;
    }
    
    public function deregisterNode(string $elementId): self {
        unset($this->nodeMap[$elementId]);
        return $this;
    }
    
    public function syncToDOM(ElNode $node, string $elementId): void {
        // Update DOM based on IR node
        $element = document.getElementById($elementId);
        if ($element) {
            $this->applyIRToElement($node, $element);
        }
    }
    
    public function syncToIR(string $elementId): ?ElNode {
        // Read current DOM state and return updated IR
        $element = document.getElementById($elementId);
        if (!$element) {
            return null;
        }
        
        return $this->elementToIR($element);
    }
    
    private function applyIRToElement(ElNode $node, DOMElement $element): void {
        // Apply props to element
        // Apply children recursively
    }
    
    private function elementToIR(DOMElement $element): ElNode {
        // Create IR node from DOM element
    }
}
```

**Manual Acceptance Checklist**:
- [ ] DOM changes reflected in IR
- [ ] IR changes reflected in DOM
- [ ] No unexpected remounting
- [ ] Node identity preserved

**Files to Change**:
- `src/Editor/Sync/SyncManager.php` (new)
- `src/Editor/Sync/Diff.php` (new)
- `src/Editor/Sync/ConflictResolver.php` (new)
- `src/Editor/Examples/D3_Sync.php` (new)

---

### Task D4: Persistence Integration
**Objective**: Integrate with PageCraft adapter for document storage

**Description**: Connect editor to document storage backend.

**Subtasks**:

1. **Create Persistence Interface**
   - File: `src/Editor/Persist/PersistInterface.php`
   - `load(string $docId): ElNode`
   - `save(string $docId, ElNode $node): void`
   - `delete(string $docId): void`

2. **Implement PageCraft Adapter**
   - File: `src/Editor/Persist/PageCraftAdapter.php`
   - Map docId to storage path/ID
   - Handle authentication/authorization
   - Implement revision tracking

3. **Add Auto-Save**
   - File: `src/Editor/Persist/AutoSaver.php`
   - Debounced save on changes
   - Save on loss of focus
   - Save on interval (configurable)

4. **Update Example**
   - File: `src/Editor/Examples/D4_Persisted.php`
   - Load document from storage
   - Make changes
   - Verify persistence

**Implementation Details**:

```php
// src/Editor/Persist/PersistInterface.php
interface PersistInterface {
    public function load(string $docId): ElNode;
    public function save(string $docId, ElNode $node): void;
    public function delete(string $docId): void;
    public function exists(string $docId): bool;
    public function getRevision(string $docId): int;
}

// src/Editor/Persist/PageCraftAdapter.php
class PageCraftAdapter implements PersistInterface {
    private string $apiUrl;
    private ?string $authToken;
    
    public function __construct(string $apiUrl, ?string $authToken = null) {
        $this->apiUrl = $apiUrl;
        $this->authToken = $authToken;
    }
    
    public function load(string $docId): ElNode {
        // Implement with HTTP client
        // Parse JSON response
        // Convert to IR
    }
    
    public function save(string $docId, ElNode $node): void {
        // Serialize IR to JSON
        // POST to API
        // Handle response
    }
    
    public function delete(string $docId): void {
        // DELETE to API
    }
    
    public function exists(string $docId): bool {
        // HEAD request
    }
    
    public function getRevision(string $docId): int {
        // GET metadata
    }
}

// src/Editor/Persist/AutoSaver.php
class AutoSaver {
    private PersistInterface $persist;
    private string $docId;
    private ?callable $onChange = null;
    private ?\stdClass $debounceTimer = null;
    private int $debounceDelay = 1000; // 1 second
    
    public function __construct(PersistInterface $persist, string $docId) {
        $this->persist = $persist;
        $this->docId = $docId;
    }
    
    public function onChange(): void {
        if ($this->debounceTimer) {
            clearTimeout($this->debounceTimer);
        }
        
        $this->debounceTimer = setTimeout(function() {
            $this->save();
            $this->debounceTimer = null;
        }, $this->debounceDelay);
    }
    
    public function save(): void {
        // Trigger save
        if ($this->onChange) {
            ($this->onChange)();
        }
    }
    
    public function setOnChange(callable $callback): self {
        $this->onChange = $callback;
        return $this;
    }
}
```

**Manual Acceptance Checklist**:
- [ ] Document loads from storage
- [ ] Changes save periodically
- [ ] Changes save on focus loss
- [ ] No data loss on refresh after save

**Files to Change**:
- `src/Editor/Persist/PersistInterface.php` (new)
- `src/Editor/Persist/PageCraftAdapter.php` (new)
- `src/Editor/Persist/AutoSaver.php` (new)
- `src/Editor/Examples/D4_Persisted.php` (new)

---

### Task D5: Event System
**Objective**: Add extensible event system for editor actions

**Description**: Implement events for major editor actions (activate, deactivate, sync, save, etc.)

**Subtasks**:

1. **Create Event Interface**
   - File: `src/Editor/Events/EditorEvent.php`
   - Base event class
   - Property accessors

2. **Define Event Types**
   - File: `src/Editor/Events/`
   - ActivateEvent, DeactivateEvent
   - SyncEvent, SaveEvent
   - ValidationErrorEvent, SaveSuccessEvent

3. **Add Event Dispatcher**
   - File: `src/Editor/Events/EventDispatcher.php`
   - `dispatch(string $eventName, EditorEvent $event)`
   - `addEventListener(string $eventName, callable $callback)`
   - `removeEventListener(string $eventName, callable $callback)`

4. **Update Example**
   - File: `src/Editor/Examples/D5_Events.php`
   - Subscribe to events
   - Log events to console
   - Use events to trigger external actions

**Implementation Details**:

```php
// src/Editor/Events/EditorEvent.php
abstract class EditorEvent {
    protected string $name;
    protected ElNode $ir;
    protected ?DOMElement $element;
    
    public function __construct(string $name, ElNode $ir, ?DOMElement $element = null) {
        $this->name = $name;
        $this->ir = $ir;
        $this->element = $element;
    }
    
    public function getName(): string {
        return $this->name;
    }
    
    public function getIR(): ElNode {
        return $this->ir;
    }
    
    public function getDOMElement(): ?DOMElement {
        return $this->element;
    }
}

// src/Editor/Events/ActivateEvent.php
class ActivateEvent extends EditorEvent {
    public function __construct(ElNode $ir, DOMElement $element) {
        parent::__construct('activate', $ir, $element);
    }
}

// src/Editor/Events/SyncEvent.php
class SyncEvent extends EditorEvent {
    private string $textContent;
    
    public function __construct(ElNode $ir, DOMElement $element, string $textContent) {
        parent::__construct('sync', $ir, $element);
        $this->textContent = $textContent;
    }
    
    public function getTextContent(): string {
        return $this->textContent;
    }
}

// src/Editor/Events/EventDispatcher.php
class EventDispatcher {
    private array $listeners = [];
    
    public function addEventListener(string $eventName, callable $callback): self {
        $this->listeners[$eventName][] = $callback;
        return $this;
    }
    
    public function removeEventListener(string $eventName, callable $callback): self {
        if (isset($this->listeners[$eventName])) {
            $this->listeners[$eventName] = array_filter(
                $this->listeners[$eventName],
                fn($cb) => $cb !== $callback
            );
        }
        return $this;
    }
    
    public function dispatch(string $eventName, EditorEvent $event): void {
        if (!isset($this->listeners[$eventName])) {
            return;
        }
        
        foreach ($this->listeners[$eventName] as $listener) {
            $listener($event);
        }
    }
}
```

**Manual Acceptance Checklist**:
- [ ] Events fire for each major action
- [ ] Event data is correct
- [ ] Listeners receive events
- [ ] Events can be取消 (removed)

**Files to Change**:
- `src/Editor/Events/EditorEvent.php` (new)
- `src/Editor/Events/ActivateEvent.php` (new)
- `src/Editor/Events/SyncEvent.php` (new)
- `src/Editor/Events/EventDispatcher.php` (new)
- `src/Editor/Examples/D5_Events.php` (new)

---

## Summary
Each task in Milestone D is a separate manual review checkpoint. These tasks add production infrastructure that should be stable and thoroughly tested.

---

## Next Steps
After Milestone D completion, proceed to Milestone E (Advanced Features and Optimization)
