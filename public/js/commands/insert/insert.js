/**
 * Phase 2 — Editor Commands: insert paragraph.
 *
 * InsertCommand — inserts a new empty paragraph at the selection.
 */

import { Command, registerCommand } from '../base.js';

export class InsertCommand extends Command {
  name = 'insert';

  execute() {
    const range = this.getRange();
    if (!range) return;
    const p = document.createElement('p');
    p.textContent = '\u00a0';
    range.insertNode(p);
  }
}

registerCommand('insert', InsertCommand);
