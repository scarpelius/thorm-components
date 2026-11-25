/**
 * Phase 2 — Editor Commands: insert block.
 *
 * InsertBlockCommand — inserts a new empty block after the current block and
 * activates it.
 */

import { Command, registerCommand, setBlockIR } from '../base.js';
import { idGenEl, idGenText } from '../../ir-parser.js';
import { onFocusIn } from '../../editor.js';

export class InsertBlockCommand extends Command {
  name = 'insertBlock';

  execute() {
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
