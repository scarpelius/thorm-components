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

    // Find the block-level element containing the start of the selection.
    const blockLevelPattern = /^(h[1-6]|p|ul|ol|blockquote|pre|div)$/;
    function findBlockLevelAncestor(node) {
      if (node && node.nodeType === 3) node = node.parentElement;
      while (node && node.nodeType === 1) {
        if (node.hasAttribute('data-block-id')) return null; // block container — stop
        if (blockLevelPattern.test(node.tagName.toLowerCase())) return node;
        node = node.parentElement;
      }
      return null;
    }

    const startEl = findBlockLevelAncestor(range.startContainer);
    const endEl = findBlockLevelAncestor(range.endContainer);

    if (!startEl && !endEl) return;

    // Determine which block-level elements to convert.
    // Case 1: selection is within a single block-level element.
    if (startEl === endEl) {
      this.convertToHeading(startEl);
      return;
    }

    // Case 2: selection spans multiple block-level elements.
    // Find the common parent and convert all block-level children between
    // startEl and endEl (inclusive).
    if (!startEl || !endEl) {
      // Only one side resolved to a block-level element; convert it.
      this.convertToHeading(startEl || endEl);
      return;
    }

    // Walk up from startEl to find the common parent of startEl and endEl.
    const startAncestors = new Set();
    let node = startEl;
    while (node && node.nodeType === 1) {
      startAncestors.add(node);
      node = node.parentElement;
    }
    node = endEl;
    let commonParent = null;
    while (node && node.nodeType === 1) {
      if (startAncestors.has(node)) {
        commonParent = node;
        break;
      }
      node = node.parentElement;
    }
    if (!commonParent) return;

    // Iterate through commonParent's children and convert block-level
    // elements that are between startEl and endEl (inclusive).
    const children = Array.from(commonParent.children);
    const startIdx = children.indexOf(startEl);
    const endIdx = children.indexOf(endEl);
    if (startIdx === -1 || endIdx === -1) return;
    const [first, last] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    for (let i = first; i <= last; i++) {
      const child = children[i];
      if (blockLevelPattern.test(child.tagName.toLowerCase())) {
        this.convertToHeading(child);
      }
    }
  }

  /**
   * Replace a block-level element with a heading of the appropriate level.
   * @param {HTMLElement} el
   */
  convertToHeading(el) {
    if (!el || !el.isConnected) return;
    const newHeading = document.createElement(`h${this.level}`);
    newHeading.innerHTML = el.innerHTML;
    el.parentElement.replaceChild(newHeading, el);
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
