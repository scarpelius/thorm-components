import { test, describe } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<html><body><div data-block-id="block-1" contenteditable="true"><p>hello world</p></div></body></html>');
const { document, window } = dom.window;
global.window = window;
global.document = document;

const { applyLinkCommand, executeCommand } = await import('/workspace/thorm-components/editor/src/js/commands.js');

// Reset the block to a given HTML content.
function resetBlock(html) {
  const block = document.querySelector('[data-block-id="block-1"]');
  block.innerHTML = html;
}

// Select a range within the first text node in the block, from offset a to offset b.
function selectFirstTextNode(a, b) {
  const textNode = document.querySelector('[data-block-id="block-1"]').firstChild;
  // If firstChild is an element, get its first text descendant
  let tn = textNode;
  while (tn && tn.nodeType !== 3) {
    tn = tn.firstChild;
  }
  const sel = window.getSelection();
  const range = window.document.createRange();
  range.setStart(tn, a);
  range.setEnd(tn, b);
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

// Select the entire contents of the first <p>.
function selectWholeP() {
  const p = document.querySelector('p');
  const sel = window.getSelection();
  const range = window.document.createRange();
  range.selectNodeContents(p);
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

function runCommand(name, context) {
  executeCommand(name, context);
}

describe('applyLinkCommand', () => {
  test('fails when URL is empty', () => {
    resetBlock('<p>hello world</p>');
    window.prompt = () => null;
    selectWholeP();
    applyLinkCommand({ blockId: 'block-1' });
    assert.strictEqual(document.querySelector('a'), null);
  });

  test('fails when there is no selected text (collapsed caret)', () => {
    resetBlock('<p>hello world</p>');
    window.prompt = () => 'https://example.com';
    const p = document.querySelector('p');
    const sel = window.getSelection();
    const range = window.document.createRange();
    range.collapse(0);
    sel.removeAllRanges();
    sel.addRange(range);
    applyLinkCommand({ blockId: 'block-1' });
    assert.strictEqual(document.querySelector('a'), null);
  });

  test('fails when there is no selection at all', () => {
    resetBlock('<p>hello world</p>');
    window.prompt = () => 'https://example.com';
    const sel = window.getSelection();
    sel.removeAllRanges();
    applyLinkCommand({ blockId: 'block-1' });
    assert.strictEqual(document.querySelector('a'), null);
  });

  test('wraps selected text in <a> when URL and text are present', () => {
    resetBlock('<p>hello world</p>');
    window.prompt = () => 'https://example.com';
    selectWholeP();
    applyLinkCommand({ blockId: 'block-1' });
    const a = document.querySelector('a');
    assert.notStrictEqual(a, null);
    assert.strictEqual(a.href, 'https://example.com/');
    assert.strictEqual(a.textContent, 'hello world');
  });
});

describe('bold toggle', () => {
  test('wraps plain selection in <strong>', () => {
    resetBlock('<p>hello world</p>');
    selectFirstTextNode(0, 11);
    runCommand('bold', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const strong = document.querySelector('strong');
    assert.notStrictEqual(strong, null);
    assert.strictEqual(strong.textContent, 'hello world');
  });

  test('unwraps when selection is fully inside <strong>', () => {
    resetBlock('<p><strong>hello world</strong></p>');
    selectFirstTextNode(0, 11);
    runCommand('bold', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const strong = document.querySelector('strong');
    assert.strictEqual(strong, null);
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
  });

  test('unwraps only the selected substring when selection is partially inside <strong>', () => {
    resetBlock('<p><strong>hello world</strong></p>');
    // Select "world" — indices 6..10 within the strong's text node.
    selectFirstTextNode(6, 11);
    runCommand('bold', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    // Expected: <strong>hello </strong>world
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
    const strongs = document.querySelectorAll('strong');
    assert.strictEqual(strongs.length, 1);
    assert.strictEqual(strongs[0].textContent, 'hello ');
    const pChildren = Array.from(document.querySelector('p').childNodes);
    assert.strictEqual(pChildren[0].tagName, 'STRONG');
    assert.strictEqual(pChildren[1].textContent, 'world');
  });
});

describe('italic toggle', () => {
  test('wraps plain selection in <em>', () => {
    resetBlock('<p>hello world</p>');
    selectFirstTextNode(0, 11);
    runCommand('italic', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const em = document.querySelector('em');
    assert.notStrictEqual(em, null);
    assert.strictEqual(em.textContent, 'hello world');
  });

  test('unwraps when selection is fully inside <em>', () => {
    resetBlock('<p><em>hello world</em></p>');
    selectFirstTextNode(0, 11);
    runCommand('italic', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const em = document.querySelector('em');
    assert.strictEqual(em, null);
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
  });
});

describe('underline toggle', () => {
  test('wraps plain selection in <u>', () => {
    resetBlock('<p>hello world</p>');
    selectFirstTextNode(0, 11);
    runCommand('underline', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const u = document.querySelector('u');
    assert.notStrictEqual(u, null);
    assert.strictEqual(u.textContent, 'hello world');
  });

  test('unwraps when selection is fully inside <u>', () => {
    resetBlock('<p><u>hello world</u></p>');
    selectFirstTextNode(0, 11);
    runCommand('underline', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const u = document.querySelector('u');
    assert.strictEqual(u, null);
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
  });

  test('unwraps only the selected substring when selection is partially inside <u>', () => {
    resetBlock('<p><u>hello world</u></p>');
    // Select "world" — indices 6..10 within the u's text node.
    selectFirstTextNode(6, 11);
    runCommand('underline', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
    const us = document.querySelectorAll('u');
    assert.strictEqual(us.length, 1);
    assert.strictEqual(us[0].textContent, 'hello ');
  });
});

describe('link toggle', () => {
  test('wraps selected text in <a> when URL and text are present', () => {
    resetBlock('<p>hello world</p>');
    window.prompt = () => 'https://example.com';
    selectFirstTextNode(0, 11);
    runCommand('link', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const a = document.querySelector('a');
    assert.notStrictEqual(a, null);
    assert.strictEqual(a.href, 'https://example.com/');
    assert.strictEqual(a.textContent, 'hello world');
  });

  test('unwraps when selection is fully inside <a>', () => {
    resetBlock('<p><a href="https://example.com">hello world</a></p>');
    window.prompt = () => null;
    selectFirstTextNode(0, 11);
    runCommand('link', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    const a = document.querySelector('a');
    assert.strictEqual(a, null);
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
  });

  test('unwraps only the selected substring and keeps href on the remaining link part', () => {
    resetBlock('<p><a href="https://example.com">hello world</a></p>');
    window.prompt = () => null;
    // Select "world" — indices 6..11 within the a's text node.
    selectFirstTextNode(6, 11);
    runCommand('link', { blockId: 'block-1', selectionRange: window.getSelection().getRangeAt(0) });
    assert.strictEqual(document.querySelector('p').textContent, 'hello world');
    const as = document.querySelectorAll('a');
    assert.strictEqual(as.length, 1);
    assert.strictEqual(as[0].textContent, 'hello ');
    assert.strictEqual(as[0].getAttribute('href'), 'https://example.com');
  });
});
