/**
 * Phase 2 — Editor Entry Point.
 *
 * Mounts the editor on all [data-block-id] blocks.
 */
console.log('[editor.js] module loaded');

import { parseDocumentStructure } from './document-structure.js';
import { showToolbar, hideToolbar } from './toolbar.js';
import { enqueueChange, removeChange } from './change-queue.js';
import { loadQueue } from './change-queue.js';
import { domToIR, diffIR } from './ir-parser.js';
import { getBlockCommandStack } from './commands.js';

let activeBlock = null;

/**
 * Find the content div for a block.
 */
function getContentEl(blockEl) {
  return blockEl;
}

/**
 * Handle a focus-in event on a block.
 */
function onFocusIn(blockEl) {
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlock === blockEl) return;
  activeBlock = blockEl;

  // Set contenteditable
  blockEl.setAttribute('contenteditable', 'true');
  showToolbar(blockEl);

  // Keyboard shortcuts
  blockEl.addEventListener('keydown', onKeydown, { once: true });
}

/**
 * Handle a focus-out event on a block.
 */
function onFocusOut(blockEl) {
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlock !== blockEl) return;
  activeBlock = null;

  // Remove contenteditable
  blockEl.removeAttribute('contenteditable');

  // Serialize DOM back to IR
  const ir = domToIR(blockEl);
  if (window.editorState?.blocks?.[blockId]) {
    const oldIR = window.editorState.blocks[blockId];
    const diff = diffIR(oldIR, ir);
    if (!diff.same) {
      window.editorState.blocks[blockId] = ir;
      enqueueChange({ blockId, ir, type: 'text-edit' });
    }
  } else {
    window.editorState = { blocks: { [blockId]: ir } };
    enqueueChange({ blockId, ir, type: 'text-edit' });
  }

  hideToolbar();
}

/**
 * Handle keydown for undo/redo.
 */
function onKeydown(e) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const key = isMac ? 'Meta' : 'Control';

  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    executeCommand('undo', {
      blockId: activeBlock.getAttribute('data-block-id'),
      documentStructure: window.documentStructure,
    });
  } else if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault();
    executeCommand('redo', {
      blockId: activeBlock.getAttribute('data-block-id'),
      documentStructure: window.documentStructure,
    });
  }
}

import { executeCommand } from './commands.js';

/**
 * Mark a block as dirty (input event).
 */
function onInput(blockEl) {
  // Just mark as dirty; actual serialization happens on blur
}

/**
 * Mount the editor on all [data-block-id] blocks.
 */
export function mountEditor() {
  // Parse document structure from DOM
  window.documentStructure = parseDocumentStructure();

  // Load any persisted change queue
  loadQueue();

  // Find all block elements
  const blocks = document.querySelectorAll('[data-block-id]');
  for (const blockEl of blocks) {
    blockEl.addEventListener('click', () => {
      onFocusIn(blockEl);
    });
    blockEl.addEventListener('input', () => {
      onInput(blockEl);
    });
    // Use a delegated focusout on document
  }

  // Delegated focusout
  document.addEventListener('focusout', (e) => {
    const blockEl = e.target.closest ? e.target.closest('[data-block-id]') : null;
    if (blockEl) {
      onFocusOut(blockEl);
    }
  });

  // Delegated keydown for shortcuts
  document.addEventListener('keydown', (e) => {
    if (!activeBlock) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeCommand('undo', {
        blockId: activeBlock.getAttribute('data-block-id'),
        documentStructure: window.documentStructure,
      });
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      executeCommand('redo', {
        blockId: activeBlock.getAttribute('data-block-id'),
        documentStructure: window.documentStructure,
      });
    }
  });
}

// Auto-mount when the module loads
mountEditor();
