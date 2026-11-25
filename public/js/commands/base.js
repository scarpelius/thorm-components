/**
 * Phase 2 — Editor Commands: base command class + registry.
 *
 * Every toolbar command extends `Command`. The base class holds the common
 * attributes (name, context, blockId, documentStructure, selectionRange) and
 * the common helpers used by the DOM logic (stack access, IR access,
 * selection/range access). Each concrete command class registers itself in
 * the `COMMANDS` registry keyed by its toolbar command name.
 */

import { domToIR, irToDom } from '../ir-parser.js';
import { applyStructuralChange } from '../document-structure.js';
import { CommandStack } from '../undo-redo.js';
import { onFocusIn } from '../editor.js';

// ---------------------------------------------------------------------------
// Common infrastructure (moved out of commands.js)
// ---------------------------------------------------------------------------

export function getBlockCommandStack(blockId) {
  if (!window.__editorCommandStacks) {
    window.__editorCommandStacks = new Map();
  }
  let stack = window.__editorCommandStacks.get(blockId);
  if (!stack) {
    stack = new CommandStack();
    window.__editorCommandStacks.set(blockId, stack);
  }
  return stack;
}

export function getDocumentCommandStack() {
  if (!window.__documentCommandStack) {
    window.__documentCommandStack = new CommandStack();
  }
  return window.__documentCommandStack;
}

export function getBlockIR(blockId) {
  if (window.editorState?.blocks?.[blockId]) {
    return window.editorState.blocks[blockId];
  }
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  return el ? domToIR(el) : [];
}

export function setBlockIR(blockId, ir) {
  if (!window.editorState) window.editorState = { blocks: {} };
  if (!window.editorState.blocks) window.editorState.blocks = {};
  window.editorState.blocks[blockId] = ir;
}

export function reRenderBlock(blockId, ir) {
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  el.innerHTML = '';
  irToDom(ir, el);
}

// ---------------------------------------------------------------------------
// Command registry
// ---------------------------------------------------------------------------

/**
 * Map of command name -> command class.
 *
 * Populated by each command module (via registerCommand) so that
 * `executeCommand` can resolve the right class by name without a giant
 * switch statement.
 */
export const COMMANDS = new Map();

/**
 * Register a command class under a command name.
 * @param {string} name - the toolbar command name (e.g. 'bold')
 * @param {typeof Command} CommandClass
 */
export function registerCommand(name, CommandClass) {
  COMMANDS.set(name, CommandClass);
}

/**
 * Look up a command class by name.
 * @param {string} name
 * @returns {typeof Command | undefined}
 */
export function getCommand(name) {
  return COMMANDS.get(name);
}

// ---------------------------------------------------------------------------
// Base Command class
// ---------------------------------------------------------------------------

/**
 * Command — base class for all toolbar commands.
 *
 * Subclasses set `name` and implement `execute()`. The constructor stores the
 * context provided by the toolbar and exposes the common helpers that most
 * commands need (block element access, selection/range access, IR access,
 * and command-stack access).
 */
export class Command {
  /**
   * The toolbar command name (e.g. 'bold', 'h2', 'splitBlock').
   * @type {string}
   */
  name;

  /**
   * The full context object provided by the toolbar.
   * @type {{ blockId?: string, documentStructure?: object, selectionRange?: Range }}
   */
  context;

  constructor(context = {}) {
    this.context = context;
    this.blockId = context.blockId;
    this.documentStructure = context.documentStructure;
    this.selectionRange = context.selectionRange;
  }

  /**
   * Get the DOM element for this command's block.
   * @returns {HTMLElement | null}
   */
  blockEl() {
    return document.querySelector(`[data-block-id="${this.blockId}"]`);
  }

  /**
   * Get the current window selection.
   * @returns {Selection | null}
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Get the current range. Restores `selectionRange` from context when the
   * toolbar captured it (since clicking a button moves focus away from the
   * block and clears the selection).
   * @returns {Range | null}
   */
  getRange() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    if (this.selectionRange) {
      selection.removeAllRanges();
      selection.addRange(this.selectionRange);
    }
    return selection.getRangeAt(0);
  }

  /**
   * Toggle a formatting tag on the current selection.
   *
   * - If the selection is entirely inside an element of `tag`, the tag is
   *   removed from the selected portion (fully covered tags are stripped,
   *   partially covered tags are split so only the selected substring loses
   *   the formatting).
   * - Otherwise the selection is wrapped in a new `tag` element.
   *
   * @param {string} tag - the tag name to toggle (e.g. 'strong', 'em', 'u').
   */
  toggleFormat(tag) {
    const range = this.getRange();
    if (!range) return;
    const blockEl = document.querySelector('[contenteditable="true"]');
    if (!blockEl) return;

    // Ensure the selection is within the editable block
    if (!blockEl.contains(range.commonAncestorContainer)) return;

    // A collapsed selection has no text to format; do nothing.
    if (range.startOffset === range.endOffset && range.commonAncestorContainer.nodeType === 3) return;

    if (this.isSelectionInsideTag(range, tag)) {
      this.unwrapSelectionFromTag(range, tag);
    } else {
      this.wrapSelectionInTag(range, tag);
    }
  }

  /**
   * Determine whether the entire selection lies inside a single element of
   * `tag`.
   * @param {Range} range
   * @param {string} tag
   * @returns {boolean}
   */
  isSelectionInsideTag(range, tag) {
    const tagName = tag.toLowerCase();
    let node = range.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentElement;
    while (node && node.nodeType === 1) {
      if (node.tagName.toLowerCase() === tagName) return true;
      if (node.hasAttribute('data-block-id')) return false;
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Remove the `tag` element from the selected portion. For each element of
   * `tag` whose text range intersects the selection:
   *   - fully covered → the element is replaced by its children.
   *   - partially covered → the element's children are split at the selection
   *     boundaries so the unselected parts stay inside the tag and the
   *     selected part is moved out.
   *
   * @param {Range} range
   * @param {string} tag
   */
  unwrapSelectionFromTag(range, tag) {
    const tagName = tag.toLowerCase();
    const blockEl = document.querySelector('[contenteditable="true"]');
    if (!blockEl) return;

    const targets = [];
    blockEl.querySelectorAll(tagName).forEach((el) => {
      if (this.rangeIntersectsElement(range, el)) targets.push(el);
    });
    // Sort so deepest (most specific) elements are handled first.
    targets.sort((a, b) => this.depth(b) - this.depth(a));

    for (const el of targets) {
      if (!el.isConnected) continue;
      const parent = el.parentElement;
      if (!parent) continue;

      if (this.selectionFullyCoversElement(range, el)) {
        parent.replaceChildren(...el.childNodes);
      } else {
        this.splitElementAtSelection(range, el);
      }
    }
  }

  /**
   * Does the selection intersect this element's text range?
   * @param {Range} range
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  rangeIntersectsElement(range, el) {
    const rangeStart = this.rangeStartOffset(range, el);
    const rangeEnd = this.rangeEndOffset(range, el);
    if (rangeStart < 0 || rangeEnd < 0) return false;
    const elEnd = el.textContent.length;
    return rangeStart < elEnd && rangeEnd > 0;
  }

  /**
   * Does the selection fully cover this element?
   * @param {Range} range
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  selectionFullyCoversElement(range, el) {
    const rangeStart = this.rangeStartOffset(range, el);
    const rangeEnd = this.rangeEndOffset(range, el);
    if (rangeStart < 0 || rangeEnd < 0) return false;
    const elEnd = el.textContent.length;
    return rangeStart <= 0 && rangeEnd >= elEnd;
  }

  /**
   * Split an element at the selection boundaries so that the selected portion
   * is moved outside the element while the unselected portions remain inside.
   *
   * @param {Range} range
   * @param {HTMLElement} el
   */
  splitElementAtSelection(range, el) {
    const parent = el.parentElement;
    if (!parent) return;

    const startOffset = this.rangeStartOffset(range, el);
    const endOffset = this.rangeEndOffset(range, el);
    const fullText = el.textContent;

    const before = this.sliceElementChildren(el, 0, startOffset);
    const selected = this.sliceElementChildren(el, startOffset, endOffset);
    const after = this.sliceElementChildren(el, endOffset, fullText.length);

    // Rebuild the element to contain only the "before" part.
    el.replaceChildren(...before);

    // Build the fragment for "selected" + optional new element for "after".
    const selectedFrag = document.createDocumentFragment();
    selected.forEach((n) => selectedFrag.appendChild(n));
    if (after.length > 0) {
      // Clone the element so it keeps its attributes (e.g. href on <a>).
      const afterEl = el.cloneNode(false);
      after.forEach((n) => afterEl.appendChild(n));
      selectedFrag.appendChild(afterEl);
    }

    // Insert the fragment after the element.
    const nextSibling = el.nextSibling;
    if (el.childNodes.length === 0) {
      // Element is now empty; remove it and insert the fragment where it was.
      parent.insertBefore(selectedFrag, nextSibling);
      el.remove();
    } else {
      parent.insertBefore(selectedFrag, nextSibling);
    }
  }

  /**
   * Return an array of nodes representing the substring of `el`'s content from
   * `start` to `end` (offsets relative to `el`'s full text content). Text nodes
   * may be split so the returned nodes exactly cover [start, end]. The nodes are
   * NOT removed from the DOM here; the caller is responsible.
   *
   * @param {HTMLElement} el
   * @param {number} start
   * @param {number} end
   * @returns {Array}
   */
  sliceElementChildren(el, start, end) {
    const nodes = [];
    let pos = 0;
    for (const child of el.childNodes) {
      if (pos >= end) break;
      const len = child.textContent.length;
      if (pos + len <= start) {
        pos += len;
        continue;
      }
      if (child.nodeType === 3) {
        const text = child.textContent;
        const textStart = pos;
        const textEnd = pos + len;
        const s = Math.max(start, textStart);
        const e = Math.min(end, textEnd);
        if (s < e) {
          const slice = text.substring(s - textStart, e - textStart);
          nodes.push(document.createTextNode(slice));
        }
        pos = textEnd;
      } else {
        // Element child: include atomically if it overlaps the selection.
        if (pos < end && pos + len > start) {
          nodes.push(child);
        }
        pos += len;
      }
    }
    return nodes;
  }

  /**
   * Compute the selection's start offset relative to the element's text content.
   * @param {Range} range
   * @param {HTMLElement} el
   * @returns {number}
   */
  rangeStartOffset(range, el) {
    return this.offsetInRange(el, range.startContainer, range.startOffset);
  }

  /**
   * Compute the selection's end offset relative to the element's text content.
   * @param {Range} range
   * @param {HTMLElement} el
   * @returns {number}
   */
  rangeEndOffset(range, el) {
    return this.offsetInRange(el, range.endContainer, range.endOffset);
  }

  /**
   * Compute the character offset of a (container, offset) position relative to
   * `el`'s text content. Returns -1 if the position is not within `el`.
   * @param {HTMLElement} el
   * @param {Node} container
   * @param {number} offset
   * @returns {number}
   */
  offsetInRange(el, container, offset) {
    if (!el.contains(container)) return -1;
    if (container === el) return offset;
    let pos = 0;
    let node = container;
    while (node && node !== el) {
      if (node.nodeType === 3) {
        // Text node: add offset within it, then move to parent.
        pos += offset;
        node = node.parentElement;
      } else if (node.nodeType === 1) {
        // Element node: add text of all previous siblings, then move to parent.
        let sibling = node.previousSibling;
        while (sibling) {
          pos += sibling.textContent.length;
          sibling = sibling.previousSibling;
        }
        node = node.parentElement;
      } else {
        node = node.parentElement;
      }
    }
    return pos;
  }

  /**
   * Depth of an element within the document (for sort order).
   * @param {Node} node
   * @returns {number}
   */
  depth(node) {
    let d = 0;
    while (node) { d++; node = node.parentElement; }
    return d;
  }

  /**
   * Wrap the selection in a new element of `tag`.
   *
   * - If the selection is within a single text node, the text node is split
   *   and only the selected portion is wrapped.
   * - If the selection spans multiple nodes, each node is moved into the
   *   wrapper.
   *
   * @param {Range} range
   * @param {string} tag
   * @param {object} [attrs={}] - optional attributes to set on the wrapper.
   */
  wrapSelectionInTag(range, tag, attrs = {}) {
    const blockEl = document.querySelector('[contenteditable="true"]');
    if (!blockEl) return;
    if (!blockEl.contains(range.commonAncestorContainer)) return;

    const wrapper = document.createElement(tag);
    for (const key of Object.keys(attrs)) {
      wrapper.setAttribute(key, attrs[key]);
    }
    const firstNode = range.startContainer;
    const lastNode = range.endContainer;

    if (firstNode === lastNode && firstNode.nodeType === 3) {
      // Selection within a single text node: split and wrap only the selected part.
      const parent = firstNode.parentElement;
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      const text = firstNode.textContent;
      const before = text.substring(0, startOffset);
      const selected = text.substring(startOffset, endOffset);
      const after = text.substring(endOffset);
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      wrapper.appendChild(document.createTextNode(selected));
      frag.appendChild(wrapper);
      if (after) frag.appendChild(document.createTextNode(after));
      parent.replaceChild(frag, firstNode);
      return;
    }

    // Selection spans multiple nodes (or is within an element).
    try {
      range.surroundContents(wrapper);
      return;
    } catch {
      // Fall through to the manual per-node approach.
    }

    // Collect the selected nodes.
    const nodes = [];
    let node = range.startContainer;
    const endNode = range.endContainer;
    while (node && node !== endNode.parentElement) {
      if (node.nodeType === 1) nodes.push(node);
      node = node.nextSibling || node.parentElement;
    }
    if (endNode.nodeType === 1) nodes.push(endNode);
    if (nodes.length === 0) return;

    // Move each node into the wrapper.
    nodes.forEach((n) => {
      wrapper.appendChild(n);
    });

    // Insert the wrapper before the first node's original position.
    const firstParent = nodes[0].parentElement;
    if (firstParent) {
      firstParent.insertBefore(wrapper, nodes[0]);
    } else {
      blockEl.appendChild(wrapper);
    }
  }

  /**
   * Serialize the block DOM to IR and store it in the editor state.
   */
  saveBlockIR() {
    const el = this.blockEl();
    if (el) {
      const ir = domToIR(el);
      setBlockIR(this.blockId, ir);
    }
  }

  /**
   * Push a command entry onto the per-block command stack.
   * @param {object} entry
   */
  pushToBlockStack(entry) {
    getBlockCommandStack(this.blockId).push(entry);
  }

  /**
   * Push a command entry onto the document-level command stack.
   * @param {object} entry
   */
  pushToDocStack(entry) {
    getDocumentCommandStack().push(entry);
  }

  /**
   * Apply a structural change to the document structure and store it.
   * @param {object} change
   */
  applyStructuralChange(change) {
    const newStructure = applyStructuralChange(change, this.documentStructure);
    if (window.documentStructure) {
      window.documentStructure = newStructure;
    }
    return newStructure;
  }

  /**
   * Create a new block element, insert it after the current block, and
   * activate it.
   * @param {string} newBlockId
   * @param {Array} newIR
   * @returns {{ newBlock: HTMLElement, newType: string }}
   */
  insertNewBlock(newBlockId, newIR) {
    const el = this.blockEl();
    const newType = this.documentStructure.blockTypes.get(this.blockId) || 'section';
    const newBlock = document.createElement('div');
    newBlock.setAttribute('data-block-id', newBlockId);
    newBlock.setAttribute('contenteditable', 'false');
    irToDom(newIR, newBlock);
    el.parentElement.insertBefore(newBlock, el.nextSibling);
    setBlockIR(newBlockId, newIR);
    onFocusIn(newBlock);
    return { newBlock, newType };
  }

  /**
   * Subclasses must implement this to perform the command's action.
   * @param {object} context
   */
  execute(context = {}) {
    throw new Error(`Command "${this.name}" does not implement execute()`);
  }
}


