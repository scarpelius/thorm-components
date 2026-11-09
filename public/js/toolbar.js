/**
 * Phase 2 — Floating Toolbar.
 *
 * A floating toolbar that appears when a block is focused.
 */

import { executeCommand } from './commands.js';

export const DEFAULT_COMMANDS = [
  { name: 'bold', label: 'Bold', icon: 'icon-bold' },
  { name: 'italic', label: 'Italic', icon: 'icon-italic' },
  { name: 'underline', label: 'Underline', icon: 'icon-underline' },
  { name: 'h2', label: 'H2', icon: 'icon-h2' },
  { name: 'ul', label: 'UL', icon: 'icon-ul' },
  { name: 'ol', label: 'OL', icon: 'icon-ol' },
  { name: 'link', label: 'Link', icon: 'icon-link' },
  { name: 'image', label: 'Image', icon: 'icon-image' },
  { name: 'insert', label: 'Insert', icon: 'icon-insert' },
  { name: 'delete', label: 'Delete', icon: 'icon-delete' },
  { name: 'splitBlock', label: 'Split', icon: 'icon-split' },
  { name: 'mergeBlocks', label: 'Merge', icon: 'icon-merge' },
  { name: 'moveBlock', label: 'Move', icon: 'icon-move' },
  { name: 'insertBlock', label: 'Insert Block', icon: 'icon-insert-block' },
  { name: 'deleteBlock', label: 'Delete Block', icon: 'icon-delete-block' },
  { name: 'undo', label: 'Undo', icon: 'icon-undo' },
  { name: 'redo', label: 'Redo', icon: 'icon-redo' },
];

let activeToolbar = null;
let activeBlockId = null;
let activeToolbarEl = null;

/**
 * Show the floating toolbar for a block.
 * @param {HTMLElement} blockEl
 */
export function showToolbar(blockEl) {
  hideToolbar();
  const blockId = blockEl.getAttribute('data-block-id');
  activeBlockId = blockId;

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.style.position = 'absolute';

  for (const cmd of DEFAULT_COMMANDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = cmd.label;
    btn.textContent = cmd.label;
    let savedRange = null;
    btn.addEventListener('mousedown', (e) => {
      // Save the selection on mousedown (before focus moves)
      const selection = window.getSelection();
      savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      executeCommand(cmd.name, {
        blockId,
        documentStructure: window.documentStructure,
        selectionRange: savedRange,
      });
    });
    toolbar.appendChild(btn);
  }

  // Position the toolbar just above the block
  const rect = blockEl.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const toolbarHeight = toolbar.offsetHeight || 40;
  toolbar.style.top = `${rect.top - toolbarHeight - 8 + scrollY}px`;
  toolbar.style.left = `${rect.left + scrollX}px`;

  document.body.appendChild(toolbar);
  activeToolbar = toolbar;
  activeToolbarEl = toolbar;
}

/**
 * Hide the floating toolbar.
 */
export function hideToolbar() {
  if (activeToolbar) {
    activeToolbar.remove();
    activeToolbar = null;
    activeToolbarEl = null;
  }
  activeBlockId = null;
}

/**
 * Toggle the toolbar for a block.
 */
export function toggleToolbar(blockEl) {
  const blockId = blockEl.getAttribute('data-block-id');
  if (activeBlockId === blockId && activeToolbar) {
    hideToolbar();
  } else {
    showToolbar(blockEl);
  }
}

/**
 * Get the current toolbar DOM element (null if no toolbar is showing).
 */
export function getActiveToolbarEl() {
  return activeToolbarEl;
}
