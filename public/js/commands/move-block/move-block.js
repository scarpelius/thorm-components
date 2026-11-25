/**
 * Phase 2 — Editor Commands: move block.
 *
 * MoveBlockCommand — moves the current block up or down in document order.
 * The `direction` ('up' | 'down') is passed via the context.
 */

import { Command, registerCommand } from '../base.js';

export class MoveBlockCommand extends Command {
  name = 'moveBlock';

  execute() {
    const el = this.blockEl();
    if (!el) return;
    const direction = this.context.direction;
    const orderIdx = this.documentStructure.blockOrder.indexOf(this.blockId);
    if (orderIdx === -1) return;
    const newIndex = direction === 'up' ? orderIdx - 1 : orderIdx + 1;
    if (newIndex < 0 || newIndex >= this.documentStructure.blockOrder.length) return;
    const newBlockId = this.documentStructure.blockOrder[newIndex];
    const newBlockEl = document.querySelector(`[data-block-id="${newBlockId}"]`);
    if (!newBlockEl) return;
    const parent = el.parentElement;
    parent.insertBefore(el, newBlockEl.nextSibling);
    parent.insertBefore(newBlockEl, el.previousElementSibling);
    const change = { type: 'moveBlock', blockId: this.blockId, newIndex };
    this.applyStructuralChange(change);
    this.pushToDocStack({
      type: 'moveBlock',
      blockId: this.blockId,
      nodeId: newBlockId,
      before: { blockId: this.blockId, newIndex },
      after: { blockId: this.blockId, newIndex },
    });
  }
}

registerCommand('moveBlock', MoveBlockCommand);
