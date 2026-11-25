/**
 * Phase 2 — Editor Commands: lists.
 *
 * OLCommand — converts the selection to an `<ol>` list (or toggles to `<ul>`).
 */

import { Command, registerCommand } from '../base.js';

export class OLCommand extends Command {
  name = 'ol';
  listType = 'ol';

  execute() {
    const range = this.getRange();
    if (!range) return;
    const blockEl = this.blockEl();
    if (!blockEl) return;
    if (!blockEl.contains(range.commonAncestorContainer)) return;

    const parent = range.commonAncestorContainer;

    // Find the innermost block-level element
    let node = parent;
    while (node && node.nodeType === 1) {
      if (/^(p|h[1-6]|ul|ol|blockquote|pre|div)$/.test(node.tagName.toLowerCase())) {
        break;
      }
      node = node.parentElement;
    }
    if (!node || !node.parentElement) return;

    // If already in a list, toggle between ul/ol
    let listParent = node;
    while (listParent && listParent.nodeType === 1) {
      if (/^(ul|ol)$/.test(listParent.tagName.toLowerCase())) {
        const newTag = this.listType === 'ul' ? 'ol' : 'ul';
        const parentList = listParent.parentElement;
        if (parentList) {
          const newList = document.createElement(newTag);
          newList.innerHTML = listParent.innerHTML;
          parentList.replaceChild(newList, listParent);
        }
        return;
      }
      listParent = listParent.parentElement;
    }

    // Create a new list
    const listEl = document.createElement(this.listType);
    const li = document.createElement('li');
    li.innerHTML = node.innerHTML;
    listEl.appendChild(li);
    node.parentElement.replaceChild(listEl, node);
  }
}

registerCommand('ol', OLCommand);
