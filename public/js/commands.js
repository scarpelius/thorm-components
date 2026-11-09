/**
 * Phase 2 — Editor Commands.
 */

import { domToIR, irToDom, idGenEl, idGenText } from './ir-parser.js';
import { applyStructuralChange } from './document-structure.js';
import { CommandStack } from './undo-redo.js';

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

function wrapSelectionInTag(tag) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  if (!parent || parent.nodeType !== 1) return;
  let node = parent;
  while (node && node.nodeType === 1) {
    if (node.tagName.toLowerCase() === tag.toLowerCase()) {
      node.replaceChildren(...node.childNodes);
      return;
    }
    node = node.parentElement;
  }
  const wrapper = document.createElement(tag);
  range.surroundContents(wrapper);
  return wrapper;
}

export function applyTextCommand(commandName, context = {}) {
  const { blockId } = context;
  const tag = commandName === 'bold' ? 'strong'
    : commandName === 'italic' ? 'em'
    : commandName === 'underline' ? 'u'
    : null;
  if (tag) wrapSelectionInTag(tag);
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (el) {
    const ir = domToIR(el);
    setBlockIR(blockId, ir);
  }
}

export function applyHeadingCommand(level, context = {}) {
  const { blockId } = context;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  let heading = parent;
  while (heading && heading.nodeType === 1) {
    if (/^h[1-6]$/.test(heading.tagName.toLowerCase())) {
      const newHeading = document.createElement(`h${level}`);
      newHeading.innerHTML = heading.innerHTML;
      heading.parentElement.replaceChild(newHeading, heading);
      return;
    }
    heading = heading.parentElement;
  }
}

export function applyListCommand(listType, context = {}) {
  const { blockId } = context;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  let listParent = parent;
  while (listParent && listParent.nodeType === 1) {
    if (/^(ul|ol)$/.test(listParent.tagName.toLowerCase())) {
      const newTag = listType === 'ul' ? 'ol' : 'ul';
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
  const li = document.createElement('li');
  li.textContent = parent.textContent;
  let list = null;
  let listParent2 = parent;
  while (listParent2 && listParent2.nodeType === 1) {
    if (/^(ul|ol)$/.test(listParent2.tagName.toLowerCase())) {
      list = listParent2;
      break;
    }
    listParent2 = listParent2.parentElement;
  }
  if (list) {
    list.appendChild(li);
  } else {
    const listEl = document.createElement(listType);
    listEl.appendChild(li);
    parent.parentElement.replaceChild(listEl, parent);
  }
}

export function applyLinkCommand(context = {}) {
  const { blockId } = context;
  const url = window.prompt('Enter URL:');
  if (!url) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const a = document.createElement('a');
  a.href = url;
  range.surroundContents(a);
}

export function applyImageCommand(context = {}) {
  const { blockId } = context;
  const src = window.prompt('Enter image URL:');
  if (!src) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const img = document.createElement('img');
  img.src = src;
  range.insertNode(img);
}

export function applyInsertCommand(context = {}) {
  const { blockId } = context;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const p = document.createElement('p');
  p.textContent = '\u00a0';
  range.insertNode(p);
}

export function applyDeleteCommand(context = {}) {
  const { blockId } = context;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  let node = parent;
  while (node && node.nodeType === 1) {
    if (/^(p|h[1-6]|li|blockquote|pre|div|figure)$/.test(node.tagName.toLowerCase())) {
      node.parentElement.removeChild(node);
      return;
    }
    node = node.parentElement;
  }
}

export function applySplitBlockCommand(context = {}) {
  const { blockId, documentStructure } = context;
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const parent = range.commonAncestorContainer;
  let line = parent;
  while (line && line.nodeType === 1) {
    if (/^(p|h[1-6]|li|blockquote|pre|div|figure)$/.test(line.tagName.toLowerCase())) {
      break;
    }
    line = line.parentElement;
  }
  if (!line || !line.parentElement) return;
  const newBlockId = `block-${Date.now()}`;
  const newType = documentStructure.blockTypes.get(blockId) || 'section';
  const parentLines = line.parentElement;
  const lines = Array.from(parentLines.children);
  const lineIdx = lines.indexOf(line);
  const remainingLines = lines.slice(lineIdx + 1);
  const newIR = remainingLines.length > 0
    ? remainingLines.map((l) => domToIR(l))
    : [{ id: idGenText(), k: 'text', value: '' }];
  remainingLines.forEach((l) => parentLines.removeChild(l));
  const newBlock = document.createElement('div');
  newBlock.setAttribute('data-block-id', newBlockId);
  newBlock.setAttribute('contenteditable', 'false');
  irToDom(newIR, newBlock);
  parentLines.parentElement.insertBefore(newBlock, parentLines.nextSibling);
  const change = {
    type: 'splitBlock',
    blockId,
    index: lineIdx,
    newBlockId,
    newType,
    newIR,
  };
  const newStructure = applyStructuralChange(change, documentStructure);
  if (window.documentStructure) {
    window.documentStructure = newStructure;
  }
  setBlockIR(newBlockId, newIR);
  setBlockIR(blockId, domToIR(el));
  const docStack = getDocumentCommandStack();
  docStack.push({
    type: 'splitBlock',
    blockId,
    index: lineIdx,
    newBlockId,
    newType,
    newIR: JSON.parse(JSON.stringify(newIR)),
  });
}

export function applyMergeBlocksCommand(context = {}) {
  const { blockId, documentStructure } = context;
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  const orderIdx = documentStructure.blockOrder.indexOf(blockId);
  if (orderIdx === -1 || orderIdx === documentStructure.blockOrder.length - 1) return;
  const targetBlockId = documentStructure.blockOrder[orderIdx + 1];
  const targetEl = document.querySelector(`[data-block-id="${targetBlockId}"]`);
  if (!targetEl) return;
  const mergedIR = [...getBlockIR(blockId), ...getBlockIR(targetBlockId)];
  targetEl.parentElement.removeChild(targetEl);
  setBlockIR(blockId, mergedIR);
  reRenderBlock(blockId, mergedIR);
  const change = {
    type: 'mergeBlocks',
    blockId,
    targetBlockId,
    mergedIR,
    mergedType: documentStructure.blockTypes.get(blockId) || 'section',
  };
  const newStructure = applyStructuralChange(change, documentStructure);
  if (window.documentStructure) {
    window.documentStructure = newStructure;
  }
  const docStack = getDocumentCommandStack();
  docStack.push({
    type: 'mergeBlocks',
    blockId,
    nodeId: targetBlockId,
    before: { blockId, targetBlockId, mergedIR: JSON.parse(JSON.stringify(mergedIR)), mergedType: change.mergedType },
    after: { blockId, targetBlockId, mergedIR: JSON.parse(JSON.stringify(mergedIR)), mergedType: change.mergedType },
  });
}

export function applyMoveBlockCommand(context = {}) {
  const { blockId, direction, documentStructure } = context;
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  const orderIdx = documentStructure.blockOrder.indexOf(blockId);
  if (orderIdx === -1) return;
  const newIndex = direction === 'up' ? orderIdx - 1 : orderIdx + 1;
  if (newIndex < 0 || newIndex >= documentStructure.blockOrder.length) return;
  const newBlockId = documentStructure.blockOrder[newIndex];
  const newBlockEl = document.querySelector(`[data-block-id="${newBlockId}"]`);
  if (!newBlockEl) return;
  const parent = el.parentElement;
  parent.insertBefore(el, newBlockEl.nextSibling);
  parent.insertBefore(newBlockEl, el.previousElementSibling);
  const change = { type: 'moveBlock', blockId, newIndex };
  const newStructure = applyStructuralChange(change, documentStructure);
  if (window.documentStructure) {
    window.documentStructure = newStructure;
  }
  const docStack = getDocumentCommandStack();
  docStack.push({
    type: 'moveBlock',
    blockId,
    nodeId: newBlockId,
    before: { blockId, newIndex },
    after: { blockId, newIndex },
  });
}

export function applyInsertBlockCommand(context = {}) {
  const { blockId, documentStructure } = context;
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  const newBlockId = `block-${Date.now()}`;
  const newType = documentStructure.blockTypes.get(blockId) || 'section';
  const newBlock = document.createElement('div');
  newBlock.setAttribute('data-block-id', newBlockId);
  newBlock.setAttribute('contenteditable', 'false');
  const p = document.createElement('p');
  p.textContent = '\u00a0';
  newBlock.appendChild(p);
  el.parentElement.insertBefore(newBlock, el.nextSibling);
  const newIR = [{ id: idGenEl(), k: 'el', tag: 'p', props: {}, children: [{ id: idGenText(), k: 'text', value: '\u00a0' }] }];
  const change = {
    type: 'insertBlock',
    blockId,
    newBlockId,
    newType,
    newIR,
  };
  const newStructure = applyStructuralChange(change, documentStructure);
  if (window.documentStructure) {
    window.documentStructure = newStructure;
  }
  setBlockIR(newBlockId, newIR);
  const docStack = getDocumentCommandStack();
  docStack.push({
    type: 'insertBlock',
    blockId,
    nodeId: newBlockId,
    before: { blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
    after: { blockId, newBlockId, newType, newIR: JSON.parse(JSON.stringify(newIR)) },
  });
}

export function applyDeleteBlockCommand(context = {}) {
  const { blockId, documentStructure } = context;
  const el = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!el) return;
  el.parentElement.removeChild(el);
  const change = { type: 'deleteBlock', blockId };
  const newStructure = applyStructuralChange(change, documentStructure);
  if (window.documentStructure) {
    window.documentStructure = newStructure;
  }
  if (window.editorState?.blocks) {
    delete window.editorState.blocks[blockId];
  }
  const docStack = getDocumentCommandStack();
  docStack.push({
    type: 'deleteBlock',
    blockId,
    nodeId: blockId,
    before: { blockId },
    after: { blockId },
  });
}

export function executeCommand(commandName, context = {}) {
  const { blockId, documentStructure } = context;
  const blockStack = getBlockCommandStack(blockId);
  switch (commandName) {
    case 'bold':
    case 'italic':
    case 'underline':
      applyTextCommand(commandName, context);
      break;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      applyHeadingCommand(parseInt(commandName.replace('h', ''), 10), context);
      break;
    case 'ul':
    case 'ol':
      applyListCommand(commandName, context);
      break;
    case 'link':
      applyLinkCommand(context);
      break;
    case 'image':
      applyImageCommand(context);
      break;
    case 'insert':
      applyInsertCommand(context);
      break;
    case 'delete':
      applyDeleteCommand(context);
      break;
    case 'splitBlock':
      applySplitBlockCommand(context);
      break;
    case 'mergeBlocks':
      applyMergeBlocksCommand(context);
      break;
    case 'moveBlock':
      applyMoveBlockCommand(context);
      break;
    case 'insertBlock':
      applyInsertBlockCommand(context);
      break;
    case 'deleteBlock':
      applyDeleteBlockCommand(context);
      break;
    case 'undo': {
      const undoCmd = blockStack.undo();
      if (undoCmd) {
        const el = document.querySelector(`[data-block-id="${blockId}"]`);
        if (el && undoCmd.before) {
          const beforeIR = undoCmd.before.ir || undoCmd.before;
          if (Array.isArray(beforeIR)) {
            reRenderBlock(blockId, beforeIR);
            setBlockIR(blockId, beforeIR);
          }
        }
      }
      break;
    }
    case 'redo': {
      const redoCmd = blockStack.redo();
      if (redoCmd) {
        const el = document.querySelector(`[data-block-id="${blockId}"]`);
        if (el && redoCmd.after) {
          const afterIR = redoCmd.after.ir || redoCmd.after;
          if (Array.isArray(afterIR)) {
            reRenderBlock(blockId, afterIR);
            setBlockIR(blockId, afterIR);
          }
        }
      }
      break;
    }
    default:
      console.warn(`Unknown command: ${commandName}`);
  }
}
