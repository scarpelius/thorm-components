/**
 * Phase 2 — Editor Commands: text formatting.
 *
 * UnderlineCommand — wraps the selection in `<u>`.
 */

import { Command, registerCommand } from '../base.js';

export class UnderlineCommand extends Command {
  name = 'underline';

  execute() {
    this.toggleFormat('u');
    this.saveBlockIR();
  }
}

registerCommand('underline', UnderlineCommand);
