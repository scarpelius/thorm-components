import { test, describe } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<html><body></body></html>');
const { document, window } = dom.window;

global.window = window;
global.document = document;

const {
  domToIR,
  irToDom,
  diffIR,
  idGenEl,
  idGenText,
  resetIdCounters,
  convertPropsToIR,
} = await import('/workspace/thorm-components/editor/src/js/ir-parser.js');

describe('domToIR', () => {
  test('converts a simple paragraph to IR', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p>Hello</p>';
    const ir = domToIR(el);
    assert.strictEqual(ir.length, 1);
    assert.strictEqual(ir[0].k, 'el');
    assert.strictEqual(ir[0].tag, 'p');
    assert.strictEqual(ir[0].children.length, 1);
    assert.strictEqual(ir[0].children[0].k, 'text');
    // Thorm IR text value is { k: 'val', v: '...' }
    assert.deepStrictEqual(ir[0].children[0].value, { k: 'val', v: 'Hello' });
  });

  test('converts nested elements', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p><strong>Bold</strong> text</p>';
    const ir = domToIR(el);
    assert.strictEqual(ir[0].tag, 'p');
    assert.strictEqual(ir[0].children.length, 2);
    assert.strictEqual(ir[0].children[0].tag, 'strong');
    assert.deepStrictEqual(ir[0].children[0].children[0].value, { k: 'val', v: 'Bold' });
    assert.deepStrictEqual(ir[0].children[1].value, { k: 'val', v: ' text' });
  });

  test('converts lists', () => {
    const el = document.createElement('div');
    el.innerHTML = '<ul><li>One</li><li>Two</li></ul>';
    const ir = domToIR(el);
    assert.strictEqual(ir[0].tag, 'ul');
    assert.strictEqual(ir[0].children.length, 2);
    assert.strictEqual(ir[0].children[0].tag, 'li');
    assert.deepStrictEqual(ir[0].children[0].children[0].value, { k: 'val', v: 'One' });
  });

  test('produces Thorm IR props shape', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p class="lead" data-x="1">Hello</p>';
    const ir = domToIR(el);
    assert.strictEqual(ir[0].props.cls, 'lead');
    assert.deepStrictEqual(ir[0].props.attrs, { 'data-x': '1' });
    assert.deepStrictEqual(ir[0].props.style, {});
    assert.deepStrictEqual(ir[0].props.on, []);
  });
});

describe('irToDom', () => {
  test('builds DOM from IR', () => {
    const ir = [
      {
        id: 'n1',
        k: 'el',
        tag: 'p',
        props: { attrs: {}, cls: null, style: {}, on: [] },
        children: [
          { id: 't1', k: 'text', value: { k: 'val', v: 'Hello' } },
        ],
      },
    ];
    const parent = document.createElement('div');
    irToDom(ir, parent);
    assert.strictEqual(parent.children.length, 1);
    assert.strictEqual(parent.children[0].tagName, 'P');
    assert.strictEqual(parent.children[0].textContent, 'Hello');
  });

  test('round-trip produces equivalent DOM', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p>Hello <strong>world</strong></p>';
    const ir = domToIR(el);
    const newEl = document.createElement('div');
    irToDom(ir, newEl);
    const ir2 = domToIR(newEl);

    assert.strictEqual(ir.length, ir2.length);
    assert.strictEqual(ir[0].tag, ir2[0].tag);
    assert.strictEqual(ir[0].children.length, ir2[0].children.length);
  });
});

describe('diffIR', () => {
  test('detects same IR', () => {
    const ir = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
    ];
    const diff = diffIR(ir, ir);
    assert.strictEqual(diff.same, true);
  });

  test('detects text change', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [
        { id: 't1', k: 'text', value: { k: 'val', v: 'Hello' } },
      ]},
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [
        { id: 't1', k: 'text', value: { k: 'val', v: 'World' } },
      ]},
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.changed.length, 1);
  });

  test('detects structural change (added node)', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
      { id: 'n2', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.added.length, 1);
  });

  test('detects structural change (removed node)', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
      { id: 'n2', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [] },
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.removed.length, 1);
  });

  test('stored Thorm IR subtree (no ids, no cls) equals DOM-serialized IR (with ids)', () => {
    // The stored content is the Thorm IR subtree: no `id`, `cls` omitted when null.
    const stored = [
      { k: 'el', tag: 'p', props: { attrs: [], style: [], on: [] }, children: [
        { k: 'text', value: { k: 'val', v: 'Hello' } },
      ]},
    ];
    // The DOM-serialized IR (from domToIR): has ids, always emits all prop groups.
    const serialized = [
      { id: 'n1', k: 'el', tag: 'p', props: { attrs: {}, cls: null, style: {}, on: [] }, children: [
        { id: 't1', k: 'text', value: { k: 'val', v: 'Hello' } },
      ]},
    ];
    const diff = diffIR(stored, serialized);
    assert.strictEqual(diff.same, true);
  });
});

describe('idGenEl / idGenText', () => {
  test('generates unique IDs', () => {
    resetIdCounters();
    const id1 = idGenEl();
    const id2 = idGenEl();
    const id3 = idGenText();
    assert.strictEqual(id1, 'n1');
    assert.strictEqual(id2, 'n2');
    assert.strictEqual(id3, 't1');
  });

  test('resetIdCounters resets counters', () => {
    resetIdCounters();
    idGenEl();
    idGenEl();
    resetIdCounters();
    assert.strictEqual(idGenEl(), 'n1');
  });
});

describe('convertPropsToIR', () => {
  test('converts class and attrs', () => {
    const el = document.createElement('div');
    el.className = 'btn primary';
    el.setAttribute('data-id', '42');
    el.setAttribute('href', '#link');
    const props = convertPropsToIR(el);
    assert.strictEqual(props.cls, 'btn primary');
    assert.strictEqual(props.attrs['data-id'], '42');
    assert.strictEqual(props.attrs.href, '#link');
  });

  test('converts inline styles', () => {
    const el = document.createElement('div');
    el.style.color = 'red';
    el.style.fontSize = '16px';
    const props = convertPropsToIR(el);
    assert.strictEqual(props.style.color, 'red');
    assert.strictEqual(props.style['font-size'], '16px');
  });
});