/**
 * Phase 2 — Editor Commands: merge blocks.
 *
 * MergeBlocksCommand — merges the current block with the next block in document
 * order, combining their IR content.
 */

import { Command, registerCommand, getBlockIR, setBlockIR, reRenderBlock } from '../base.js';

export class MergeBlocksCommand extends Command {
  name = 'mergeBlocks';

  execute() {
    const el = this.blockEl();
    if (!el) return;
    const orderIdx = this.documentStructure.blockOrder.indexOf(this.blockId);
    if (orderIdx === -1 || orderIdx === this.documentStructure.blockOrder.length - 1) return;
    const targetBlockId = this.documentStructure.blockOrder[orderIdx + 1];
    const targetEl = document.querySelector(`[data-block-id="${targetBlockId}"]`);
    if (!targetEl) return;
    const mergedIR = [...getBlockIR(this.blockId), ...getBlockIR(targetBlockId)];
    targetEl.parentElement.removeChild(targetEl);
    setBlockIR(this.blockId, mergedIR);
    reRenderBlock(this.blockId, mergedIR);
    const change = {
      type: 'mergeBlocks',
      blockId: this.blockId,
      targetBlockId,
      mergedIR,
      mergedType: this.documentStructure.blockTypes.get(this.blockId) || 'section',
    };
    this.applyStructuralChange(change);
    this.pushToDocStack({
      type: 'mergeBlocks',
      blockId: this.blockId,
      nodeId: targetBlockId,
      before: { blockId: this.blockId, targetBlockId, mergedIR: JSON.parse(JSON.stringify(mergedIR)), mergedType: change.mergedType },
      after: { blockId: this.blockId, targetBlockId, mergedIR: JSON.parse(JSON.stringify(mergedIR)), mergedType: change.mergedType },
    });
  }
}

registerCommand('mergeBlocks', MergeBlocksCommand);
