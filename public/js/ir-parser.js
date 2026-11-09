
/**
 * Phase 2 — IR parser.
 *
 * Serializes a block's DOM content back into the editor IR format
 * (the array format used by IRToThorm.php on the server) and provides
 * IR→DOM build + shallow diff helpers for local re-rendering.
 */

const SKIP_TAG_NAMES = new Set(['script', 'style', 'template']);
let elCounter = 0;
let textCounter = 0;

export function idGenEl() {
  elCounter += 1;
  return `n${elCounter}`;
}

export function idGenText() {
  textCounter += 1;
  return `t${textCounter}`;
}

export function resetIdCounters() {
  elCounter = 0;
  textCounter = 0;
}

export function convertPropsToIR(el) {
  const props = { style: {}, class: '', attrs: {} };
  if (el.style && el.style.length > 0) {
    for (let i = 0; i < el.style.length; i++) {
      const key = el.style[i].propertyName || el.style[i];
      const val = el.style.getPropertyValue(key);
      if (typeof key === 'string' && key.length > 0 && val !== null && val !== undefined) {
        props.style[key] = val;
      }
    }
  }
  if (el.className) props.class = el.className;
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name === 'class' || attr.name === 'style') continue;
    props.attrs[attr.name] = attr.value;
  }
  return props;
}

/**
 * Serialize a block's DOM content into the editor IR array format.
 * @param {HTMLElement} el - The block's content div.
 * @param {boolean} [includeFragmentMarkers=false]
 * @returns {Array}
 */
export function domToIR(el, includeFragmentMarkers = false) {
  const nodes = [];
  for (const node of el.childNodes) {
    if (node.nodeType === 1) {
      const converted = convertElementToIR(node);
      if (converted) nodes.push(converted);
    } else if (node.nodeType === 3) {
      const value = node.textContent;
      if (value.length > 0) {
        nodes.push({ id: idGenText(), k: 'text', value });
      }
    } else if (node.nodeType === 8 && includeFragmentMarkers) {
      const text = node.data || '';
      if (text === 'fragment:start' || text === 'fragment:end') {
        nodes.push({ id: idGenText(), k: 'text', value: `<!--${text}-->` });
      }
    }
  }
  return nodes;
}

function convertElementToIR(el) {
  if (SKIP_TAG_NAMES.has(el.tagName.toLowerCase())) return null;
  const node = {
    id: idGenEl(),
    k: 'el',
    tag: el.tagName.toLowerCase(),
    props: convertPropsToIR(el),
    children: [],
  };
  for (const child of el.childNodes) {
    if (child.nodeType === 1) {
      const converted = convertElementToIR(child);
      if (converted) node.children.push(converted);
    } else if (child.nodeType === 3) {
      const value = child.textContent;
      if (value.length > 0) {
        node.children.push({ id: idGenText(), k: 'text', value });
      }
    }
  }
  return node;
}

/**
 * Build a DOM subtree from an IR node array.
 * @param {Array} ir
 * @param {HTMLElement} parent
 * @param {boolean} [includeFragmentMarkers=true]
 * @returns {HTMLElement}
 */
export function irToDom(ir, parent, includeFragmentMarkers = true) {
  for (const node of ir) {
    appendIRNodeToDom(parent, node, includeFragmentMarkers);
  }
  return parent;
}

function appendIRNodeToDom(parent, node, includeFragmentMarkers) {
  if (node.k === 'text') {
    const value = node.value || '';
    if (includeFragmentMarkers && value.startsWith('<!--') && value.endsWith('-->')) {
      parent.appendChild(document.createComment(value.slice(4, -4)));
    } else {
      parent.appendChild(document.createTextNode(value));
    }
    return;
  }
  if (node.k !== 'el') return;
  const el = document.createElement(node.tag || 'div');
  if (node.props) {
    if (node.props.style) {
      for (const [prop, value] of Object.entries(node.props.style)) {
        if (el.style[prop] !== undefined) el.style[prop] = value;
      }
    }
    if (node.props.class) el.className = node.props.class;
    if (node.props.attrs) {
      for (const [name, value] of Object.entries(node.props.attrs)) {
        el.setAttribute(name, value);
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      appendIRNodeToDom(el, child, includeFragmentMarkers);
    }
  }
  parent.appendChild(el);
}

/**
 * Shallow per-node comparison of two IR arrays.
 * @returns {{ same: boolean, nodes: { added: Array, removed: Array, changed: Array } }}
 */
export function diffIR(oldIR, newIR) {
  const oldById = new Map();
  const oldByIndex = new Map();
  for (let i = 0; i < oldIR.length; i++) {
    const n = oldIR[i];
    if (n && n.id) oldById.set(n.id, n);
    oldByIndex.set(i, n);
  }
  const newById = new Map();
  for (let i = 0; i < newIR.length; i++) {
    const n = newIR[i];
    if (n && n.id) newById.set(n.id, n);
  }
  const added = [];
  const removed = [];
  const changed = [];
  for (let i = 0; i < newIR.length; i++) {
    const n = newIR[i];
    if (!n) continue;
    const existing = n.id ? oldById.get(n.id) : oldByIndex.get(i) || null;
    if (existing && nodesAreEqual(existing, n)) continue;
    if (existing) changed.push({ id: n.id, old: existing, new: n });
    else added.push(n);
  }
  for (let i = 0; i < oldIR.length; i++) {
    const n = oldIR[i];
    if (!n) continue;
    if (n.id && newById.has(n.id)) continue;
    removed.push(n);
  }
  const same = added.length === 0 && removed.length === 0 && changed.length === 0;
  return { same, nodes: { added, removed, changed } };
}

function nodesAreEqual(a, b) {
  if (a.k !== b.k) return false;
  if (a.id !== b.id) return false;
  if (a.tag && b.tag && a.tag !== b.tag) return false;
  if (a.value !== undefined && b.value !== undefined && a.value !== b.value) return false;
  if (a.props && b.props) {
    if (!propsEqual(a.props, b.props)) return false;
  } else if (a.props || b.props) {
    return false;
  }
  if (a.children && b.children) {
    if (a.children.length !== b.children.length) return false;
    for (let i = 0; i < a.children.length; i++) {
      if (!nodesAreEqual(a.children[i], b.children[i])) return false;
    }
  } else if (a.children || b.children) {
    return false;
  }
  return true;
}

function propsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!b.hasOwnProperty(key)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
}
