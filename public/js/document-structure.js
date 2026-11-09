/**
 * Phase 2 — Document Structure.
 *
 * Derives the document structure from the DOM and maintains a
 * blockId → IR map.
 */

import { domToIR, irToDom } from './ir-parser.js';

/**
 * Parse the document structure from the DOM.
 *
 * Walks all `[data-block-id]` elements in DOM order.
 *
 * @returns {{
 *   blockIds: string[],
 *   blockOrder: string[],
 *   blockTypes: Map<string, string>,
 *   blocks: Map<string, Array>
 * }}
 */
export function parseDocumentStructure() {
  const blockIds = [];
  const blockOrder = [];
  const blockTypes = new Map();
  const blocks = new Map();

  const elements = document.querySelectorAll('[data-block-id]');
  for (const el of elements) {
    const blockId = el.getAttribute('data-block-id');
    if (!blockId) continue;

    blockIds.push(blockId);
    blockOrder.push(blockId);

    // Derive type from data-type attribute or sibling h2, fallback 'section'
    const type = el.getAttribute('data-type')
      || (el.previousElementSibling?.tagName === 'H2' ? el.previousElementSibling.textContent.trim() : 'section')
      || 'section';
    blockTypes.set(blockId, type);

    // Get IR from window.editorState or domToIR
    const ir = (window.editorState?.blocks?.[blockId] || domToIR(el));
    blocks.set(blockId, ir);
  }

  return { blockIds, blockOrder, blockTypes, blocks };
}

/**
 * Get the current IR for a block.
 * @param {string} blockId
 * @param {Map<string, Array>} blocks
 * @returns {Array}
 */
export function blockIdToIR(blockId, blocks) {
  return blocks.get(blockId) || [];
}

/**
 * Apply a structural change to the in-memory structure.
 * @param {object} change
 * @param {{ blockIds: string[], blockOrder: string[], blockTypes: Map<string, string>, blocks: Map<string, Array> }} structure
 * @returns {{ blockIds: string[], blockOrder: string[], blockTypes: Map<string, string>, blocks: Map<string, Array> }}
 */
export function applyStructuralChange(change, structure) {
  const { blockIds, blockOrder, blockTypes, blocks } = structure;

  switch (change.type) {
    case 'splitBlock': {
      const { blockId, index, newBlockId, newType, newIR } = change;
      const orderIdx = blockOrder.indexOf(blockId);
      if (orderIdx === -1) return structure;

      // Insert new block after the split point
      const newOrder = [...blockOrder];
      newOrder.splice(orderIdx + 1, 0, newBlockId);

      blocks.set(newBlockId, newIR);
      blockTypes.set(newBlockId, newType || 'section');

      return {
        blockIds: [...blockIds, newBlockId],
        blockOrder: newOrder,
        blockTypes,
        blocks,
      };
    }

    case 'mergeBlocks': {
      const { blockId, targetBlockId, mergedIR, mergedType } = change;
      if (blockId === targetBlockId) return structure;

      const orderIdx = blockOrder.indexOf(targetBlockId);
      if (orderIdx === -1) return structure;

      // Remove the target block from order
      const newOrder = blockOrder.filter((id) => id !== targetBlockId);

      // Update the blockId to hold the merged IR
      blocks.set(blockId, mergedIR);
      blockTypes.set(blockId, mergedType || 'section');

      return {
        blockIds: blockIds.filter((id) => id !== targetBlockId),
        blockOrder: newOrder,
        blockTypes,
        blocks,
      };
    }

    case 'moveBlock': {
      const { blockId, newIndex } = change;
      const orderIdx = blockOrder.indexOf(blockId);
      if (orderIdx === -1) return structure;

      const newOrder = [...blockOrder];
      const removed = newOrder.splice(orderIdx, 1);
      newOrder.splice(Math.max(0, Math.min(newIndex, newOrder.length)), 0, ...removed);

      return { blockIds, blockOrder: newOrder, blockTypes, blocks };
    }

    case 'insertBlock': {
      const { blockId, newBlockId, newType, newIR } = change;
      const orderIdx = blockOrder.indexOf(blockId);
      if (orderIdx === -1) return structure;

      const newOrder = [...blockOrder];
      newOrder.splice(orderIdx + 1, 0, newBlockId);

      blocks.set(newBlockId, newIR);
      blockTypes.set(newBlockId, newType || 'section');

      return {
        blockIds: [...blockIds, newBlockId],
        blockOrder: newOrder,
        blockTypes,
        blocks,
      };
    }

    case 'deleteBlock': {
      const { blockId } = change;
      const orderIdx = blockOrder.indexOf(blockId);
      if (orderIdx === -1) return structure;

      const newOrder = blockOrder.filter((id) => id !== blockId);
      blocks.delete(blockId);
      blockTypes.delete(blockId);

      return {
        blockIds: blockIds.filter((id) => id !== blockId),
        blockOrder: newOrder,
        blockTypes,
        blocks,
      };
    }
  }

  return structure;
}
