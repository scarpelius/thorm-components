/**
 * Phase 2 — Editor Commands: delete block.
 *
 * DeleteBlockCommand — removes the current block from the document and
 * updates the document structure.
 */

import { Command, registerCommand } from '../base.js';

export class DeleteBlockCommand extends Command {
  name = 'deleteBlock';

  execute() {
    const el = this.blockEl();
    if (!el) return;
    el.parentElement.removeChild(el);
    const change = { type: 'deleteBlock', blockId: this.blockId };
    this.applyStructuralChange(change);
    if (window.editorState?.blocks) {
      delete window.editorState.blocks[this.blockId];
    }
    this.pushToDocStack({
      type: 'deleteBlock',
      blockId: this.blockId,
      nodeId: this.blockId,
      before: { blockId: this.blockId },
      after: { blockId: this.blockId },
    });
  }
}

registerCommand('deleteBlock', DeleteBlockCommand);
