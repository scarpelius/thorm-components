/**
 * Phase 2 — Editor Commands: text formatting.
 *
 * BoldCommand — wraps the selection in `<strong>`.
 */

import { Command, registerCommand } from '../base.js';

export class BoldCommand extends Command {
  name = 'bold';

  execute() {
    this.toggleFormat('strong');
    this.saveBlockIR();
  }
}

registerCommand('bold', BoldCommand);

