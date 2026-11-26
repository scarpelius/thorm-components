/**
 * Phase 2 — Editor Commands: lists.
 *
 * ULCommand — converts the selection to a `<ul>` list (or toggles to `<ol>`).
 *
 * The selection may cover a single block-level element (e.g. one `<p>`) or
 * span multiple block-level elements (e.g. two `<p>` paragraphs). In either
 * case, every block-level element the selection covers becomes a list item
 * (`<li>`), and all items are placed inside a single list element. Edge blocks
 * that are only partially covered are split so the unselected portion stays
 * outside the list.
 */

import { Command, registerCommand } from '../base.js';

const BLOCK_LEVEL_PATTERN = /^(p|h[1-6]|ul|ol|blockquote|pre|div)$/;
const LIST_PATTERN = /^(ul|ol)$/;

export class ULCommand extends Command {
  name = 'ul';
  listType = 'ul';

  execute() {
    const range = this.getRange();
    if (!range) return;
    const blockEl = this.blockEl();
    if (!blockEl) return;
    if (!blockEl.contains(range.commonAncestorContainer)) return;

    // A collapsed selection (pure caret) has no text to convert; do nothing.
    if (range.startOffset === range.endOffset && range.commonAncestorContainer.nodeType === 3) return;

    const startEl = this.findBlockLevelAncestor(range.startContainer);
    const endEl = this.findBlockLevelAncestor(range.endContainer);

    // Selection starts/ends on the block container itself — nothing to convert.
    if (!startEl && !endEl) return;

    // Case 1: selection is within a single block-level element.
    if (startEl === endEl) {
      this.convertSingleBlock(startEl);
      return;
    }

    // Case 2: selection spans multiple block-level elements.
    if (!startEl || !endEl) {
      this.convertSingleBlock(startEl || endEl);
      return;
    }

    const commonParent = this.findCommonParent(startEl, endEl);
    if (!commonParent) return;

    const children = Array.from(commonParent.children);
    const startIdx = children.indexOf(startEl);
    const endIdx = children.indexOf(endEl);
    if (startIdx === -1 || endIdx === -1) return;
    const [first, last] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

    // For each block-level child in the selection range, extract the selected
    // content as a fragment (the block's children if fully covered, or the
    // selected portion if partially covered). The unselected portions are left
    // in the DOM in their original position.
    const fragments = [];
    for (let i = first; i <= last; i++) {
      const child = children[i];
      if (!BLOCK_LEVEL_PATTERN.test(child.tagName.toLowerCase())) continue;
      if (child.hasAttribute('data-block-id')) continue;

      const frag = this.selectedContentFragment(range, child);
      if (frag) fragments.push(frag);
    }

    if (fragments.length === 0) return;

    // Build the list with empty <li> wrappers, insert it into the DOM at the
    // position of the first block (before moving content in), then fill each
    // <li> with its fragment.
    const firstItem = fragments[0];
    const firstBlock = children[first];
    const firstBlockParent = firstBlock.parentElement;
    const firstBlockNextSibling = firstBlock.nextSibling;

    const listEl = document.createElement(this.listType);
    const lis = [];
    for (const frag of fragments) {
      const li = document.createElement('li');
      li.appendChild(frag);
      listEl.appendChild(li);
      lis.push(li);
    }

    if (firstBlockParent) {
      firstBlockParent.insertBefore(listEl, firstBlockNextSibling);
    }

    // Remove any original blocks that are now empty (their content moved into
    // the list) to avoid leftover empty elements.
    for (let i = first; i <= last; i++) {
      const child = children[i];
      if (child.parentNode && child.childNodes.length === 0) {
        child.remove();
      }
    }

    this.restoreSelectionInNewList(listEl);
  }

  /**
   * Find the innermost block-level element containing `node` (walking up).
   * Returns null if only the block container is reached.
   * @param {Node} node
   */
  findBlockLevelAncestor(node) {
    if (!node || !node.nodeType) return null;
    let n = node;
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n.nodeType === 1) {
      if (n.hasAttribute('data-block-id')) return null;
      if (BLOCK_LEVEL_PATTERN.test(n.tagName.toLowerCase())) return n;
      n = n.parentElement;
    }
    return null;
  }

  /**
   * Find the common parent of two block-level elements.
   * @param {HTMLElement} a
   * @param {HTMLElement} b
   * @returns {HTMLElement | null}
   */
  findCommonParent(a, b) {
    const aAncestors = new Set();
    let node = a;
    while (node && node.nodeType === 1) {
      aAncestors.add(node);
      node = node.parentElement;
    }
    node = b;
    while (node && node.nodeType === 1) {
      if (aAncestors.has(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  /**
   * Convert a single block-level element to a list.
   * - If it's already a list, toggle between ul/ol.
   * - Otherwise wrap it in a new list as a single item (the block's content
   *   becomes the list item's content).
   * @param {HTMLElement} el
   */
  convertSingleBlock(el) {
    if (!el || !el.isConnected) return;

    if (LIST_PATTERN.test(el.tagName.toLowerCase())) {
      const currentTag = el.tagName.toLowerCase();
      if (currentTag !== this.listType) {
        const parent = el.parentElement;
        if (parent) {
          const newList = document.createElement(this.listType);
          newList.innerHTML = el.innerHTML;
          parent.replaceChild(newList, el);
          this.restoreSelectionInNewList(newList);
        }
      }
      return;
    }

    const listEl = document.createElement(this.listType);
    const li = document.createElement('li');
    li.innerHTML = el.innerHTML;
    listEl.appendChild(li);
    el.parentElement.replaceChild(listEl, el);
    this.restoreSelectionInNewList(listEl);
  }

  /**
   * Extract the selected content of a block-level element as a DocumentFragment.
   *
   * - If the selection fully covers the element, the fragment contains all of
   *   the element's children (and the element is left empty so it is removed
   *   by the caller).
   * - If the selection partially covers the element (edge block), the element
   *   is split at the selection boundaries: the fragment contains only the
   *   selected portion, and the unselected portions remain in the DOM.
   * - If nothing is selected inside the element, returns null.
   *
   * @param {Range} range
   * @param {HTMLElement} el
   * @returns {DocumentFragment | null}
   */
  selectedContentFragment(range, el) {
    const parent = el.parentElement;
    if (!parent) return null;

    const rawStart = this.rangeStartOffset(range, el);
    const rawEnd = this.rangeEndOffset(range, el);
    const fullText = el.textContent;

    // When the selection spans multiple blocks, the "far" boundary of an edge
    // block is outside that block (offset -1). Treat a -1 start as "starts
    // before this block" (covered from 0) and a -1 end as "ends after this
    // block" (covered to the end).
    const startOffset = rawStart < 0 ? 0 : rawStart;
    const endOffset = rawEnd < 0 ? fullText.length : rawEnd;

    // Nothing selected inside this element.
    if (endOffset <= 0 || startOffset >= fullText.length) {
      return null;
    }

    const s = Math.max(0, startOffset);
    const e = Math.min(fullText.length, endOffset);

    // Fully covered — return a fragment of all the element's children.
    if (s <= 0 && e >= fullText.length) {
      const frag = document.createDocumentFragment();
      for (const child of Array.from(el.childNodes)) {
        frag.appendChild(child);
      }
      return frag;
    }

    // Partially covered — split the element into before / selected / after.
    const before = this.sliceElementChildren(el, 0, s);
    const selected = this.sliceElementChildren(el, s, e);
    const after = this.sliceElementChildren(el, e, fullText.length);

    // Rebuild el to hold only the "before" portion.
    el.replaceChildren(...before);

    // Build the "after" element (clone, to keep tag/attributes) only if there
    // is an "after" portion.
    const afterEl = el.cloneNode(false);
    after.forEach((n) => afterEl.appendChild(n));

    // Build a fragment holding the selected portion.
    const frag = document.createDocumentFragment();
    selected.forEach((n) => frag.appendChild(n));

    // Insert the "after" element after el in the DOM (el keeps the "before"
    // portion; the selected portion is now in the fragment). Only insert if
    // the after portion is non-empty.
    const nextSibling = el.nextSibling;
    if (afterEl.childNodes.length > 0) {
      const insertFrag = document.createDocumentFragment();
      insertFrag.appendChild(afterEl);
      parent.insertBefore(insertFrag, nextSibling);
    }

    // If el is now empty, remove it.
    if (el.childNodes.length === 0) {
      el.remove();
    }

    return frag;
  }

  /**
   * After wrapping a node in a new list (or toggling the list type), restore
   * the selection to match the position the user had before the command ran.
   *
   * Since the DOM structure changes, the original range is no longer valid.
   * We try to find the corresponding text node in the new list and place the
   * caret there. If we can't, we place the caret at the end of the first list item.
   *
   * @param {HTMLElement} newList - the newly created (or replaced) list element
   */
  restoreSelectionInNewList(newList) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const blockEl = this.blockEl();
    if (!blockEl) return;

    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    const li = newList.querySelector('li');
    if (!li) return;

    // Case 1: The original selection was on a text node.
    // Find the matching text node in the new list by value.
    if (startContainer.nodeType === 3) {
      const allTextNodes = [];
      (function collect(node) {
        if (node.nodeType === 3) allTextNodes.push(node);
        for (const child of node.childNodes) collect(child);
      })(li);

      const oldText = startContainer.textContent;
      let newTextNode = null;
      for (const tn of allTextNodes) {
        if (tn.textContent === oldText) {
          newTextNode = tn;
          break;
        }
      }

      if (newTextNode) {
        const newRange = document.createRange();
        newRange.setStart(newTextNode, Math.min(startOffset, newTextNode.textContent.length));
        newRange.setEnd(newTextNode, Math.min(endOffset, newTextNode.textContent.length));
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
      }
    }

    // Fallback: place caret at the end of the first list item
    const newRange = document.createRange();
    newRange.setEnd(li, li.childNodes.length);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

registerCommand('ul', ULCommand);
