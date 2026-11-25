/**
 * Phase 2 — Editor Entry Point.
 *
 * Mounts the editor on all [data-block-id] blocks.
 */

import { parseDocumentStructure } from './document-structure.js';
import { showToolbar, hideToolbar, getActiveToolbarEl } from './toolbar.js';
import { enqueueChange, removeChange, loadQueue } from './change-queue.js';
import { domToIR, diffIR } from './ir-parser.js';
import { getBlockCommandStack, executeCommand } from './commands.js';

let activeBlock = null;

/**
 * Find the content div for a block.
 */
function getContentEl(blockEl) {
  return blockEl;
}

/**
 * Deactivate a block (remove editable state, serialize DOM to IR).
 */
function deactivateBlock(blockEl) {
  // Remove contenteditable and active class
  blockEl.removeAttribute('contenteditable');
  blockEl.classList.remove('editor-active');

  // Serialize DOM back to IR
  const blockId = blockEl.getAttribute('data-block-id');
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
 * Handle a focus-in event on a block.
 *
 * Exported so that block commands (e.g. insertBlock) can activate a newly
 * created block directly.
 */
export function onFocusIn(blockEl) {
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlock === blockEl) return;

  // Deactivate the previously active block (if any)
  if (activeBlock) {
    deactivateBlock(activeBlock);
  }

  activeBlock = blockEl;

  // Set contenteditable and mark as active
  blockEl.setAttribute('contenteditable', 'true');
  blockEl.classList.add('editor-active');
  showToolbar(blockEl);
}

/**
 * Handle a focus-out event on a block.
 */
function onFocusOut(blockEl) {
  if (activeBlock !== blockEl) return;
  activeBlock = null;
  deactivateBlock(blockEl);
}

/**
 * Mount the editor on all [data-block-id] blocks.
 */
export function mountEditor() {
  // Parse document structure from DOM
  window.documentStructure = parseDocumentStructure();

  // Load any persisted change queue
  loadQueue();

  // Delegate block clicks so blocks created later (e.g. insertBlock) work too
  document.addEventListener('click', (e) => {
    const blockEl = e.target.closest ? e.target.closest('[data-block-id]') : null;
    if (blockEl) {
      onFocusIn(blockEl);
    }
  });

  // Delegated focusout (capture phase — focusout does not bubble)
  document.addEventListener('focusout', (e) => {
    // Ignore focusout when focus moves to the toolbar
    const toolbarEl = getActiveToolbarEl();
    if (toolbarEl && (
      toolbarEl.contains(e.target) ||
      (e.relatedTarget && toolbarEl.contains(e.relatedTarget))
    )) return;
    const blockEl = e.target.closest ? e.target.closest('[data-block-id]') : null;
    if (blockEl) {
      onFocusOut(blockEl);
    }
  }, true);

  // Click outside all blocks → deactivate the active block
  document.addEventListener('click', (e) => {
    if (!activeBlock) return;
    // Ignore clicks inside the toolbar
    const toolbarEl = getActiveToolbarEl();
    if (toolbarEl && toolbarEl.contains(e.target)) return;
    const clickedBlock = e.target.closest ? e.target.closest('[data-block-id]') : null;
    if (clickedBlock === activeBlock) return; // still clicking inside the active block
    if (clickedBlock === null) {
      // Clicked outside all blocks
      onFocusOut(activeBlock);
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
