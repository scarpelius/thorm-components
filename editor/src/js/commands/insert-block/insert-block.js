/**
 * Phase 2 — Editor Commands: insert block.
 *
 * InsertBlockCommand — inserts a new empty block relative to the current
 * block and activates it.
 *
 * Supported insertion modes (passed via `context.insertMode`):
 *   - 'below'  (default): insert the new block after the current block.
 *   - 'above':  insert the new block before the current block.
 *   - 'cursor': insert a new block inside the current block, after the
 *               element where the cursor is. If the cursor is directly in
 *               the block's `<div>`, the new block is appended at the end of
 *               the block. The caret must be within the current block;
 *               otherwise the command is a no-op.
 */

import { Command, registerCommand, setBlockIR } from '../base.js';
import { idGenEl, idGenText } from '../../ir-parser.js';
import { onFocusIn } from '../../editor.js';

export class InsertBlockCommand extends Command {
  name = 'insertBlock';

  execute() {
    const el = this.blockEl();
    if (!el) return;

    const insertMode = this.context.insertMode || 'below';

    if (insertMode === 'cursor') {
      // "Insert at cursor" inserts a new block inside the current block,
      // after the element where the cursor is. If the cursor is on a text
      // node, we use its parent element as the anchor. If the cursor is at
      // the block level (directly in the block's <div>), we insert at the
      // end of the block.
      //
      // The caret must be within the current block; otherwise the command
      // is a no-op.
      const range = this.getRange();
      if (!range) return;
      let anchor = range.commonAncestorContainer;
      if (anchor.nodeType === 3) anchor = anchor.parentElement;
      // Walk up to verify the cursor is within the current block.
      let node = anchor;
      while (node && node.nodeType === 1) {
        if (
          node.tagName.toLowerCase() === 'div' &&
          node.getAttribute('data-block-id') === this.blockId
        ) break;
        node = node.parentElement;
      }
      if (!node) return;

      // Determine the anchor element for insertion.
      // If the cursor is directly in the block's <div>, anchor = null (insert at end).
      // If the cursor is inside a child element (e.g., <p>), anchor = that element.
      const blockEl = this.blockEl();
      let anchorEl = null;
      if (anchor && anchor !== blockEl && blockEl.contains(anchor)) {
        anchorEl = anchor;
      }
      // Insert the new block inside the current block, after anchorEl (or at end).
      this.insertInsideCurrentBlock(anchorEl);
      return;
    }

    if (insertMode === 'above') {
      this.insertBeforeCurrentBlock();
      return;
    }

    // Default: insert after the current block.
    this.insertAfterCurrentBlock();
  }

  /**
   * Create a new empty block element, insert it inside the current block
   * after the given anchor element (or at the end of the block if no anchor),
   * update the document structure and activate the new block.
   * @param {HTMLElement|null} anchorEl - the element after which to insert;
   *        null means insert at the end of the block.
   */
  insertInsideCurrentBlock(anchorEl) {
    const el = this.blockEl();
    if (!el) return;
    const newBlockId = `block-${Date.now()}`;
    const newType = this.documentStructure.blockTypes.get(this.blockId) || 'section';
    const newBlock = document.createElement('div');
    newBlock.setAttribute('data-block-id', newBlockId);
    newBlock.setAttribute('contenteditable', 'false');
    const p = document.createElement('p');
    p.textContent = '\u00a0';
    newBlock.appendChild(p);
    // Insert inside the current block, after anchorEl (or at end).
    if (anchorEl && el.contains(anchorEl)) {
      el.insertBefore(newBlock, anchorEl.nextSibling);
    } else {
      el.appendChild(newBlock);
    }
    const newIR = [{ id: idGenEl(), k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [{ id: idGenText(), k: 'text', value: { k: 'val', v: '\u00a0' } }] }];
    const change = {
      type: 'insertBlock',
      blockId: this.blockId,
      newBlockId,
      newType,
      newIR,
      insertBefore: false,
    };
    this.applyStructuralChange(change);
    setBlockIR(newBlockId, newIR);
    this.pushToDocStack({
      type: 'insertBlock',
      blockId: this.blockId,
      nodeId: newBlockId,
      before: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
      after: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
    });
    // Automatically activate the newly inserted block
    onFocusIn(newBlock);
  }

  /**
   * Create a new empty block element, insert it after the current block,
   * update the document structure and activate the new block.
   */
  insertAfterCurrentBlock() {
    const el = this.blockEl();
    if (!el) return;
    const newBlockId = `block-${Date.now()}`;
    const newType = this.documentStructure.blockTypes.get(this.blockId) || 'section';
    const newBlock = document.createElement('div');
    newBlock.setAttribute('data-block-id', newBlockId);
    newBlock.setAttribute('contenteditable', 'false');
    const p = document.createElement('p');
    p.textContent = '\u00a0';
    newBlock.appendChild(p);
    el.parentElement.insertBefore(newBlock, el.nextSibling);
    const newIR = [{ id: idGenEl(), k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [{ id: idGenText(), k: 'text', value: { k: 'val', v: '\u00a0' } }] }];
    const change = {
      type: 'insertBlock',
      blockId: this.blockId,
      newBlockId,
      newType,
      newIR,
      insertBefore: false,
    };
    this.applyStructuralChange(change);
    setBlockIR(newBlockId, newIR);
    this.pushToDocStack({
      type: 'insertBlock',
      blockId: this.blockId,
      nodeId: newBlockId,
      before: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
      after: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
    });
    // Automatically activate the newly inserted block
    onFocusIn(newBlock);
  }

  /**
   * Create a new empty block element, insert it before the current block,
   * update the document structure and activate the new block.
   */
  insertBeforeCurrentBlock() {
    const el = this.blockEl();
    if (!el) return;
    const newBlockId = `block-${Date.now()}`;
    const newType = this.documentStructure.blockTypes.get(this.blockId) || 'section';
    const newBlock = document.createElement('div');
    newBlock.setAttribute('data-block-id', newBlockId);
    newBlock.setAttribute('contenteditable', 'false');
    const p = document.createElement('p');
    p.textContent = '\u00a0';
    newBlock.appendChild(p);
    el.parentElement.insertBefore(newBlock, el);
    const newIR = [{ id: idGenEl(), k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [{ id: idGenText(), k: 'text', value: { k: 'val', v: '\u00a0' } }] }];
    const change = {
      type: 'insertBlock',
      blockId: this.blockId,
      newBlockId,
      newType,
      newIR,
      insertBefore: true,
    };
    this.applyStructuralChange(change);
    setBlockIR(newBlockId, newIR);
    this.pushToDocStack({
      type: 'insertBlock',
      blockId: this.blockId,
      nodeId: newBlockId,
      before: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
      after: { blockId: this.blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
    });
    // Automatically activate the newly inserted block
    onFocusIn(newBlock);
  }
}

registerCommand('insertBlock', InsertBlockCommand);
