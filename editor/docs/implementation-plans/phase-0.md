# Phase 0: Preparation & Understanding

## Overview
This phase ensures the team has a complete understanding of the requirements, architecture, and current state before implementation begins.

## Tasks

### Task 0.1: Study the Architecture Specification
**Objective**: Understand the Thorm Editor architecture and requirements

**Subtasks**:
1. Read and document the entire `THORM_EDITOR_ARCHITECTURE_SPEC.md` document
2. Identify and summarize the 10 primary goals
3. List and explain all non-goals and constraints
4. Document the "Rules for implementing agent" section
5. Create a glossary of terms specific to Thorm Editor
6. Document the architecture principles:
   - Thorm owns the IR and DOM mounting
   - No second document schema
   - contenteditable as temporary editing interface only
   - No wholesale DOM replacement

**Deliverables**:
- Documented understanding of architecture
- Glossary of terms
- Summary of principles

**Acceptance**: Team can explain architecture to each other without referring to docs

---

### Task 0.2: Review Current Thorm Implementation
**Objective**: Understand the current Thorm codebase structure

**Subtasks**:
1. Locate the Thorm repository root and understand directory structure
2. Identify key files:
   - Core IR node types (ElNode, TextNode, FragmentNode, etc.)
   - Render system (Render class, BuildExample class)
   - Runtime mount system (how elements are mounted in browser)
3. Understand the IR-to-DOM rendering pipeline:
   - How PHP IR becomes HTML
   - How HTML is hydrated in browser
   - How state/atoms are managed
4. Identify any existing editor-related code
5. Document the helpers available (text(), p(), h1(), button(), on(), etc.)

**Deliverables**:
- Directory structure diagram
- Key file locations documented
- IR node type summary
- Helper function reference

**Acceptance**: Can run the example page and understand what each part does

---

### Task 0.3: Understand Thorm IR Structure
**Objective**: Deep understanding of IR nodes and operations

**Subtasks**:
1. Study the base Node class interface
2. Understand the following node types:
   - ElNode (HTML elements)
   - TextNode (text content)
   - FragmentNode (container of nodes)
   - ComponentNode (components)
   - ShowNode (conditional rendering)
   - RepeatNode (list rendering)
   - SlotNode (component slots)
3. Understand IR operations:
   - Node collection and traversal
   - Atom collection
   - Rendering pipeline
   - Runtime payload generation
4. Study the render system:
   - Render class
   - BuildExample class
   - Template system

**Deliverables**:
- IR node documentation
- Render system documentation
- Examples of IR usage

**Acceptance**: Can create simple IR by hand and predict its rendered output

---

### Task 0.4: Understand Thorm Runtime System
**Objective**: Understand how IR is executed in the browser

**Subtasks**:
1. Study the runtime mount system:
   - PrimitiveMount base class
   - Element mounts (ElMount, TextMount, etc.)
   - How mounts receive IR payloads
   - How DOM is created and updated
2. Understand the hydration cycle:
   - SSR → Client hydration
   - State management
   - Event propagation
3. Identify extension points:
   - Can new mount types be added?
   - Can IR be extended?
   - What hooks are available?

**Deliverables**:
- Runtime system documentation
- Mount lifecycle explanation
- Extension points identified

**Acceptance**: Can trace a simple element through the full pipeline

---

### Task 0.5: Set Up Development Environment
**Objective**: Prepare environment for implementation

**Subtasks**:
1. Verify PHP version and extensions (required by Thorm)
2. Verify Composer is working
3. Verify the example page runs:
   - Run `php src/index.php`
   - Open in browser
   - Verify functionality
4. Set up IDE/editor for PHP development
5. Configure debugging if needed
6. Set up Git branch for implementation

**Deliverables**:
- Working development environment
- Example page running
- Git branch created

**Acceptance**: Can edit, run, and see changes in browser

---

### Task 0.6: Review PageCraft Requirements
**Objective**: Understand PageCraft's specific needs

**Subtasks**:
1. Review the adapter interface requirements:
   - Document storage
   - Permission checks
   - Revision records
   - Lock services
2. Understand the current PageCraft API
3. Identify which features are in scope vs. future scope
4. Document PageCraft-specific constraints

**Deliverables**:
- PageCraft requirements documented
- Adapter interface understood
- Scope boundaries defined

**Acceptance**: Can explain what belongs in adapters vs. core

---

## Next Steps
After Phase 0 completion, proceed to Phase 1 (Milestone A): First Visible Editor
