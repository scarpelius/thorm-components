/**
 * Phase 2 — Editor Commands: headings.
 *
 * HeadingCommand — replaces the innermost block-level element in the selection
 * with an `<hN>` element. `level` (1-6) is set via the constructor option.
 */

import { Command, registerCommand } from '../base.js';

export class HeadingCommand extends Command {
  /**
   * @param {number} level - heading level (1-6)
   * @param {object} context - command context
   */
  constructor(level, context = {}) {
    super(context);
    this.level = level;
  }

  execute() {
    const range = this.getRange();
    if (!range) return;
    const blockEl = this.blockEl();
    if (!blockEl) return;
    if (!blockEl.contains(range.commonAncestorContainer)) return;

    // Find the innermost block-level element in the selection
    let node = range.commonAncestorContainer;
    while (node && node.nodeType === 1) {
      if (/^(h[1-6]|p|ul|ol|blockquote|pre|div)$/.test(node.tagName.toLowerCase())) {
        const newHeading = document.createElement(`h${this.level}`);
        newHeading.innerHTML = node.innerHTML;
        node.parentElement.replaceChild(newHeading, node);
        return;
      }
      node = node.parentElement;
    }
  }
}

/**
 * Register heading commands h1-h6, each bound to its level.
 */
for (let level = 1; level <= 6; level++) {
  const name = `h${level}`;
  const makeCommand = (level) => class extends HeadingCommand {
    constructor(context = {}) {
      super(level, context);
    }
  };
  registerCommand(name, makeCommand(level));
}
