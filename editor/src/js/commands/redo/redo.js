/**
 * Phase 2 — Editor Commands: redo.
 *
 * RedoCommand — pops the last command from the per-block redo stack and
 * restores the block IR to its "after" state.
 */

import { Command, registerCommand, getBlockCommandStack, reRenderBlock, setBlockIR } from '../base.js';

export class RedoCommand extends Command {
  name = 'redo';

  execute() {
    const blockStack = getBlockCommandStack(this.blockId);
    const redoCmd = blockStack.redo();
    if (redoCmd) {
      const el = document.querySelector(`[data-block-id="${this.blockId}"]`);
      if (el && redoCmd.after) {
        const afterIR = redoCmd.after.ir || redoCmd.after;
        if (Array.isArray(afterIR)) {
          reRenderBlock(this.blockId, afterIR);
          setBlockIR(this.blockId, afterIR);
        }
      }
    }
  }
}

registerCommand('redo', RedoCommand);
