/**
 * Phase 2 — Editor Commands: link.
 *
 * LinkCommand — wraps the selection in an `<a>` tag with a prompted URL.
 */

import { Command, registerCommand } from '../base.js';

export class LinkCommand extends Command {
  name = 'link';

  execute() {
    const range = this.getRange();
    if (!range) return;
    const blockEl = document.querySelector('[contenteditable="true"]');
    if (!blockEl) return;
    if (!blockEl.contains(range.commonAncestorContainer)) return;
    // A link requires selected text; fail if the selection is empty (collapsed caret)
    if (range.startOffset === range.endOffset) return;

    // If the selection is entirely inside an existing <a>, remove the link.
    if (this.isSelectionInsideTag(range, 'a')) {
      this.unwrapSelectionFromTag(range, 'a');
      this.saveBlockIR();
      return;
    }

    const url = window.prompt('Enter URL:');
    if (!url) return;
    this.wrapSelectionInTag(range, 'a', { href: url });
    this.saveBlockIR();
  }
}

registerCommand('link', LinkCommand);
