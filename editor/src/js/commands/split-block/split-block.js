/**
 * Phase 2 — Editor Commands: split block.
 *
 * SplitBlockCommand — splits the block at the selection into two blocks,
 * moving the lines after the selected line into a new block.
 */

import { Command, registerCommand, setBlockIR } from '../base.js';
import { domToIR, irToDom, idGenText } from '../../ir-parser.js';

export class SplitBlockCommand extends Command {
  name = 'splitBlock';

  execute() {
    const el = this.blockEl();
    if (!el) return;
    const range = this.getRange();
    if (!range) return;
    const parent = range.commonAncestorContainer;
    let line = parent;
    while (line && line.nodeType === 1) {
      if (/^(p|h[1-6]|li|blockquote|pre|div|figure)$/.test(line.tagName.toLowerCase())) {
        break;
      }
      line = line.parentElement;
    }
    if (!line || !line.parentElement) return;
    const newBlockId = `block-${Date.now()}`;
    const newType = this.documentStructure.blockTypes.get(this.blockId) || 'section';
    const parentLines = line.parentElement;
    const lines = Array.from(parentLines.children);
    const lineIdx = lines.indexOf(line);
    const remainingLines = lines.slice(lineIdx + 1);
    const newIR = remainingLines.length > 0
      ? remainingLines.map((l) => domToIR(l))
      : [{ id: idGenText(), k: 'text', value: { k: 'val', v: '' } }];
    remainingLines.forEach((l) => parentLines.removeChild(l));
    const newBlock = document.createElement('div');
    newBlock.setAttribute('data-block-id', newBlockId);
    newBlock.setAttribute('contenteditable', 'false');
    irToDom(newIR, newBlock);
    parentLines.parentElement.insertBefore(newBlock, parentLines.nextSibling);
    const change = {
      type: 'splitBlock',
      blockId: this.blockId,
      index: lineIdx,
      newBlockId,
      newType,
      newIR,
    };
    this.applyStructuralChange(change);
    // Update IR for both blocks
    setBlockIR(newBlockId, newIR);
    setBlockIR(this.blockId, domToIR(el));
    this.pushToDocStack({
      type: 'splitBlock',
      blockId: this.blockId,
      index: lineIdx,
      newBlockId,
      newType,
      newIR: JSON.parse(JSON.stringify(newIR)),
    });
  }
}

registerCommand('splitBlock', SplitBlockCommand);

