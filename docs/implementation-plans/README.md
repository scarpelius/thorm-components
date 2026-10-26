# Thorm Editor Implementation Plans

This directory contains detailed implementation plans for building the Thorm Editor on top of the Thorm framework.

## Overview

The Thorm Editor is built using Thorm's IR (Intermediate Representation) system. The editor allows users to edit content in-place while maintaining synchronization with Thorm's DOM mounting system.

## Architecture Principles

1. **Thorm owns the IR and DOM mounting** - The editor works with Thorm's IR, not a separate document model
2. **No second document schema** - The editor uses Thorm's existing IR types
3. **contenteditable as temporary interface** - The editor uses `contenteditable` only during editing; saved content is regular Thorm IR
4. **No wholesale DOM replacement** - Elements are modified in-place without remounting

## Implementation Phases

### Phase 0: Preparation & Understanding
**Files**: `phase-0.md`

- Study the architecture specification
- Review current Thorm implementation
- Understand Thorm IR structure
- Understand Thorm runtime system
- Set up development environment
- Review PageCraft requirements

### Phase 1: Milestone A - First Visible Editor
**Files**: `phase-1-milestone-a.md`

- Create a visible inert editor area
- Add PHP-facing editor declaration helper
- Attach JS extension to editor hosts
- Verify editor renders as ordinary HTML

### Phase 2: Milestone B - Basic In-Place Editing
**Files**: `phase-2-milestone-b.md`

- Activate one element for editing (contenteditable)
- Deactivate editing with explicit finish action
- Configurable block identity (data attributes)
- Read the edited value
- First IR-synchronized text edit

### Phase 3: Milestone C - Formatting and Structure
**Files**: `phase-3-milestone-c.md`

- Bold and italic formatting
- Link formatting
- Paragraph separation (Enter key)
- Undo/redo history
- List formatting (optional)

### Phase 4: Milestone D - Production-Ready Infrastructure
**Files**: `phase-4-milestone-d.md`

- HTML sanitization
- Toolbar architecture
- IR synchronization
- Persistence integration
- Event system

### Phase 5: Milestone E - Advanced Features and Optimization
**Files**: `phase-5-milestone-e.md`

- Multi-block operations
- Drag and drop
- Spell check and language
- Performance optimization
- Testing suite
- Documentation

## Implementation Workflow

1. **Read the architecture specification** - Understand the system before implementing
2. **Start with Phase 0** - Ensure you understand the requirements and current state
3. **Implement Milestone A** - Get a visible, inert editor working
4. **Move to Milestone B** - Add basic in-place editing
5. **Continue through milestones** - Build features incrementally
6. **Manual verification** - Each task must be manually verified before proceeding

## Important Rules

1. **One task at a time** - Implement exactly one small, manually verifiable vertical slice
2. **Stop for review** - After each task, stop and get maintainer review
3. **No premature generalization** - Solve the immediate problem first
4. **Preserve IR integrity** - Never replace the document model with HTML
5. **Preserve DOM identity** - Never wholesale replace DOM elements

## Directory Structure

```
docs/implementation-plans/
├── README.md           # This file
├── phase-0.md          # Preparation & Understanding
├── phase-1-milestone-a.md    # First Visible Editor
├── phase-2-milestone-b.md    # Basic In-Place Editing
├── phase-3-milestone-c.md    # Formatting and Structure
├── phase-4-milestone-d.md    # Production-Ready Infrastructure
└── phase-5-milestone-e.md    # Advanced Features and Optimization
```

## Getting Started

1. Read `phase-0.md` for background
2. Read `phase-1-milestone-a.md` for the first implementation task
3. Follow the implementation checklist for each task
4. Manually verify each task before proceeding
5. Stop for maintainer review after each task
