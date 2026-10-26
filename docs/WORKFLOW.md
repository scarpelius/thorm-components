# Thorm Editor Implementation Workflow

This document outlines the standard workflow for implementing tasks across all phases of the Thorm Editor project.

## Overview

This workflow ensures consistency across all tasks, proper branching strategy, and complete documentation of implementation progress.

## Workflow Steps

### 1. Review Task Requirements

Before starting any task:
- Read the task description in `docs/implementation-plans/phase-X.md`
- Understand the objective, subtasks, and acceptance criteria
- Review any referenced architecture documents

### 2. Create Branch from Updated Main

**Branch naming convention**: `phaseX-taskN-description`

Where:
- `phaseX` = phase number (0, 1, 2, 3, 4, 5)
- `taskN` = task number (task1, task2, etc.)
- `description` = brief lowercase hyphenated description

**Examples**:
- `phase0-task1-preparation_and_understanding`
- `phase1-task1-inert_editor_host`
- `phase2-task2-basic_in_place_editing`

**Steps**:
```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create new branch
git checkout -b phaseX-taskN-description
```

### 3. Create Task Documentation Files

Inside `docs/tasks/`, create two files:

**Task Plan File**: `phaseX-taskN.md`
- Detailed implementation plan for the task
- Subtasks with implementation details
- Files to create/modify
- Acceptance checklist

**Task Log File**: `phaseX-taskN.log`
- Empty file to log implementation progress
- Date format: `YYYY-MM-DD HH:MM`
- Log each significant step taken

### 4. Task Plan File Template

```markdown
# Phase X: Task N - Task Title

## Objective
[What this task aims to accomplish]

## Subtasks

### Subtask X.X: [Subtask Name]
[Detailed description]

**Implementation Steps**:
1. 
2. 
3. 

**Files to Create/Modify**:
- `src/.../filename.php` (new/modify)
- `public/.../file.html` (new/modify)

**Implementation Notes**:
[Any important implementation details]

**Acceptance Checklist**:
- [ ] Step 1 verified
- [ ] Step 2 verified
- [ ] Acceptance criteria met

---

[Repeat for each subtask]
```

### 5. Task Log File Format

The log file tracks progress with timestamps:

```log
2026-10-26 14:30 - Task started
2026-10-26 14:35 - Created [file]
2026-10-26 14:40 - Implemented [feature]
2026-10-26 14:45 - [Issue encountered and resolved]
2026-10-26 14:50 - Verification completed
```

**Log Rules**:
- Do NOT edit the log file after creating entries
- Append only - use `>>` when adding to logs
- Include full date with hour and minute
- Log both successes and challenges

### 6. Implementation Process

For each subtask:

1. **Plan** - Update task plan file with implementation approach
2. **Implement** - Make code changes
3. **Log** - Add entry to task log file with timestamp
4. **Verify** - Manually test according to acceptance criteria
5. **Update Plan** - Check off completed items in task plan

### 7. Stopping Points

**STOP FOR REVIEW** after each task completion:

Before moving to next task:
- [ ] All subtasks completed
- [ ] All acceptance criteria verified
- [ ] Code reviewed by maintainer
- [ ] Branch pushed to origin
- [ ] PR created (if major changes)

### 8. Pushing and Pull Requests

```bash
# Push branch to origin
git push origin phaseX-taskN-description

# Create PR
# Title: "Phase X: Task N - [Brief description]"
# Description: Reference the task plan file
```

## Phase-Specific Notes

### Phase 0: Preparation & Understanding

- Focus on documentation and understanding
- No code changes required
- Task plan = understanding summary
- Task log = learning notes and questions

### Phase 1-5: Implementation

- Each milestone has specific implementation tasks
- Follow the "STOP FOR REVIEW" pattern
- Verify each increment manually

## Quick Reference

### Branch Naming
```
phaseX-taskN-description
```

### File Locations
- Task Plans: `docs/tasks/phaseX-taskN.md`
- Task Logs: `docs/tasks/phaseX-taskN.log`
- Implementation Plans: `docs/implementation-plans/`

### Log Timestamp Format
```
YYYY-MM-DD HH:MM - [Entry]
```

## Next Steps

After completing all Phase 0 tasks:
1. Proceed to Phase 1 (Milestone A)
2. Follow the same workflow for each milestone
3. Update this document if improvements are found