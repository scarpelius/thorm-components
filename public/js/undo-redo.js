/**
 * Phase 2 — Undo/Redo.
 *
 * Per-block CommandStack for content commands and a document-level
 * CommandStack for structural operations.
 */

/**
 * CommandStack — stores node-level before/after snapshots.
 */
export class CommandStack {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.stack = [];
    this.redoStack = [];
  }

  /**
   * Push a command onto the stack.
   * @param {{ type: string, nodeId: string, before: object, after: object }} command
   */
  push(command) {
    this.stack.push(command);
    this.redoStack = [];
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  /**
   * Undo the last command.
   * @returns {{ type: string, nodeId: string, before: object, after: object }} | null
   */
  undo() {
    if (this.stack.length === 0) return null;
    const command = this.stack.pop();
    this.redoStack.push(command);
    return command;
  }

  /**
   * Redo the last undone command.
   * @returns {{ type: string, nodeId: string, before: object, after: object }} | null
   */
  redo() {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop();
    this.stack.push(command);
    return command;
  }

  /**
   * Clear the stack.
   */
  clear() {
    this.stack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.stack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }
}

/**
 * Document-level command stack for structural operations.
 */
export class DocumentCommandStack {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.stack = [];
    this.redoStack = [];
  }

  push(command) {
    this.stack.push(command);
    this.redoStack = [];
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  undo() {
    if (this.stack.length === 0) return null;
    const command = this.stack.pop();
    this.redoStack.push(command);
    return command;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop();
    this.stack.push(command);
    return command;
  }

  clear() {
    this.stack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.stack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }
}
