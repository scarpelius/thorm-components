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
    assert.strictEqual(ir[0].children[0].value, 'Hello');
  });

  test('converts nested elements', () => {
    const el = document.createElement('div');
    el.innerHTML = '<p><strong>Bold</strong> text</p>';
    const ir = domToIR(el);
    assert.strictEqual(ir[0].tag, 'p');
    assert.strictEqual(ir[0].children.length, 2);
    assert.strictEqual(ir[0].children[0].tag, 'strong');
    assert.strictEqual(ir[0].children[0].children[0].value, 'Bold');
    assert.strictEqual(ir[0].children[1].value, ' text');
  });

  test('converts lists', () => {
    const el = document.createElement('div');
    el.innerHTML = '<ul><li>One</li><li>Two</li></ul>';
    const ir = domToIR(el);
    assert.strictEqual(ir[0].tag, 'ul');
    assert.strictEqual(ir[0].children.length, 2);
    assert.strictEqual(ir[0].children[0].tag, 'li');
    assert.strictEqual(ir[0].children[0].children[0].value, 'One');
  });
});

describe('irToDom', () => {
  test('builds DOM from IR', () => {
    const ir = [
      {
        id: 'n1',
        k: 'el',
        tag: 'p',
        props: {},
        children: [
          { id: 't1', k: 'text', value: 'Hello' },
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
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [] },
    ];
    const diff = diffIR(ir, ir);
    assert.strictEqual(diff.same, true);
  });

  test('detects text change', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [
        { id: 't1', k: 'text', value: 'Hello' },
      ]},
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [
        { id: 't1', k: 'text', value: 'World' },
      ]},
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.changed.length, 1);
  });

  test('detects structural change (added node)', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [] },
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [] },
      { id: 'n2', k: 'el', tag: 'p', props: {}, children: [] },
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.added.length, 1);
  });

  test('detects structural change (removed node)', () => {
    const ir1 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [] },
      { id: 'n2', k: 'el', tag: 'p', props: {}, children: [] },
    ];
    const ir2 = [
      { id: 'n1', k: 'el', tag: 'p', props: {}, children: [] },
    ];
    const diff = diffIR(ir1, ir2);
    assert.strictEqual(diff.same, false);
    assert.strictEqual(diff.nodes.removed.length, 1);
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
    assert.strictEqual(props.class, 'btn primary');
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