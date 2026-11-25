/**
 * Phase 2 — Editor Commands: delete paragraph.
 *
 * DeleteCommand — removes the innermost block-level element containing the
 * selection.
 */

import { Command, registerCommand } from '../base.js';

export class DeleteCommand extends Command {
  name = 'delete';

  execute() {
    const range = this.getRange();
    if (!range) return;
    let node = range.commonAncestorContainer;
    while (node && node.nodeType === 1) {
      if (/^(p|h[1-6]|li|blockquote|pre|div|figure)$/.test(node.tagName.toLowerCase())) {
        node.parentElement.removeChild(node);
        return;
      }
      node = node.parentElement;
    }
  }
}

registerCommand('delete', DeleteCommand);
