/**
 * Phase 2 — Editor Commands: text formatting.
 *
 * ItalicCommand — wraps the selection in `<em>`.
 */

import { Command, registerCommand } from '../base.js';

export class ItalicCommand extends Command {
  name = 'italic';

  execute() {
    this.toggleFormat('em');
    this.saveBlockIR();
  }
}

registerCommand('italic', ItalicCommand);
