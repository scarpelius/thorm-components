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
 * Handle a focus-in event on a block.
 */
function onFocusIn(blockEl) {
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlock === blockEl) return;
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
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlock !== blockEl) return;
  activeBlock = null;

  // Remove contenteditable and active class
  blockEl.removeAttribute('contenteditable');
  blockEl.classList.remove('editor-active');

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
      // Mark as dirty; actual serialization happens on blur
    });
  }

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
