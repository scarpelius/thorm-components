/**
 * Phase 2 — Editor Commands (barrel).
 *
 * This file is the public entry point for the editor commands. It re-exports
 * the common infrastructure from `commands/base.js` and all command classes
 * from their respective module files, and provides the `executeCommand`
 * dispatcher that resolves a command by name via the `COMMANDS` registry.
 *
 * Individual command implementations live in `commands/<group>/<name>.js`.
 */

import {
  getBlockCommandStack,
  getDocumentCommandStack,
  getBlockIR,
  setBlockIR,
  reRenderBlock,
  COMMANDS,
  getCommand,
  registerCommand,
  Command,
} from './commands/base.js';

// Import all command groups so they self-register in the COMMANDS registry.
import './commands/text/index.js';
import './commands/heading/index.js';
import './commands/list/index.js';
import './commands/link/index.js';
import './commands/image/index.js';
import './commands/insert/index.js';
import './commands/delete/index.js';
import './commands/split-block/index.js';
import './commands/merge-blocks/index.js';
import './commands/move-block/index.js';
import './commands/insert-block/index.js';
import './commands/delete-block/index.js';
import './commands/undo/index.js';
import './commands/redo/index.js';

// ---------------------------------------------------------------------------
// Re-export common infrastructure
// ---------------------------------------------------------------------------

export {
  getBlockCommandStack,
  getDocumentCommandStack,
  getBlockIR,
  setBlockIR,
  reRenderBlock,
  COMMANDS,
  getCommand,
  registerCommand,
  Command,
};

// ---------------------------------------------------------------------------
// executeCommand — thin dispatcher that resolves the command by name
// ---------------------------------------------------------------------------

/**
 * Execute a toolbar command by name.
 *
 * Resolves the command class from the COMMANDS registry and invokes its
 * `execute()` method with the provided context.
 *
 * @param {string} commandName - the toolbar command name (e.g. 'bold', 'h2')
 * @param {object} context - command context (blockId, documentStructure, selectionRange)
 */
export function executeCommand(commandName, context = {}) {
  const CommandClass = getCommand(commandName);
  if (!CommandClass) {
    console.warn(`Unknown command: ${commandName}`);
    return;
  }
  new CommandClass(context).execute();
}

// ---------------------------------------------------------------------------
// Backward-compatible function wrappers
// ---------------------------------------------------------------------------

import { LinkCommand } from './commands/link/link.js';

/**
 * applyLinkCommand — backward-compatible wrapper for the LinkCommand class.
 * Kept for existing unit tests that import this function.
 *
 * @param {object} context - command context
 */
export function applyLinkCommand(context = {}) {
  new LinkCommand(context).execute();
}
