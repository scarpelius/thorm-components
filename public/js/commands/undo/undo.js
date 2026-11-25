/**
 * Phase 2 — Editor Commands: undo.
 *
 * UndoCommand — pops the last command from the per-block stack and restores
 * the block IR to its "before" state.
 */

import { Command, registerCommand, getBlockCommandStack, reRenderBlock, setBlockIR } from '../base.js';

export class UndoCommand extends Command {
  name = 'undo';

  execute() {
    const blockStack = getBlockCommandStack(this.blockId);
    const undoCmd = blockStack.undo();
    if (undoCmd) {
      const el = document.querySelector(`[data-block-id="${this.blockId}"]`);
      if (el && undoCmd.before) {
        const beforeIR = undoCmd.before.ir || undoCmd.before;
        if (Array.isArray(beforeIR)) {
          reRenderBlock(this.blockId, beforeIR);
          setBlockIR(this.blockId, beforeIR);
        }
      }
    }
  }
}

registerCommand('undo', UndoCommand);
