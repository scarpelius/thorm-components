
/**
 * Phase 2 — IR parser.
 *
 * Serializes a block's DOM content into the Thorm IR subtree format — the exact
 * same representation the page is rendered from (the output of a Thorm node's
 * jsonSerialize()). This is a *subtree of the IR*, not a separate "editor IR"
 * representation, so the editor can save and restore from the identical IR.
 *
 * Thorm IR node payload shapes:
 *   element: { k: 'el', tag: 'p', props: { attrs: {...}, cls: ..., style: {...}, on: [] }, children: [...] }
 *   text:    { k: 'text', value: { k: 'val', v: '...' } }
 *
 * It also provides IR→DOM build + shallow diff helpers for local re-rendering.
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

/**
 * Convert a DOM element's props into the Thorm IR props shape:
 *   { attrs: {...}, cls: string|null, style: {...}, on: [] }
 */
export function convertPropsToIR(el) {
  const props = { attrs: {}, cls: null, style: {}, on: [] };
  if (el.style && el.style.length > 0) {
    for (let i = 0; i < el.style.length; i++) {
      const key = el.style[i].propertyName || el.style[i];
      const val = el.style.getPropertyValue(key);
      if (typeof key === 'string' && key.length > 0 && val !== null && val !== undefined) {
        props.style[key] = val;
      }
    }
  }
  if (el.className) props.cls = el.className;
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name === 'class' || attr.name === 'style') continue;
    props.attrs[attr.name] = attr.value;
  }
  return props;
}

/**
 * Serialize a block's DOM content into the Thorm IR subtree array format.
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
        nodes.push(toTextIR(value));
      }
    } else if (node.nodeType === 8 && includeFragmentMarkers) {
      const text = node.data || '';
      if (text === 'fragment:start' || text === 'fragment:end') {
        nodes.push(toTextIR(`<!--${text}-->`));
      }
    }
  }
  return nodes;
}

/**
 * Build a text IR node from a string value (Thorm IR: { k:'text', value: {k:'val', v} }).
 */
function toTextIR(value) {
  return { id: idGenText(), k: 'text', value: { k: 'val', v: value } };
}

function convertElementToIR(el) {
  if (SKIP_TAG_NAMES.has(el.tagName.toLowerCase())) return null;
  // Skip nested blocks — they have their own IR stored separately and should
  // not be serialized into the parent block's IR.
  if (el.hasAttribute('data-block-id')) return null;
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
        node.children.push(toTextIR(value));
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
    const value = textValue(node.value);
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
    if (node.props.cls) el.className = node.props.cls;
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
 * Extract the plain string value from a Thorm IR text value. A text value is
 * either a plain scalar (legacy editor IR) or a Thorm expression such as
 * { k: 'val', v: '...' }.
 */
function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.k === 'val') return String(value.v ?? '');
  return String(value);
}

/**
 * Compare two IR arrays positionally.
 *
 * The stored Thorm IR subtree carries no node ids (and each DOM serialization
 * generates fresh ids), so id-based matching is unreliable. We compare by
 * position using a deep structural equality that ignores `id`, which correctly
 * reports whether the two IR trees represent the same content.
 *
 * @returns {{ same: boolean, nodes: { added: Array, removed: Array, changed: Array } }}
 */
export function diffIR(oldIR, newIR) {
  const added = [];
  const removed = [];
  const changed = [];
  const maxLen = Math.max(oldIR.length, newIR.length);

  for (let i = 0; i < maxLen; i++) {
    const oldNode = i < oldIR.length ? oldIR[i] : null;
    const newNode = i < newIR.length ? newIR[i] : null;

    if (oldNode && newNode) {
      if (!nodesAreEqual(oldNode, newNode)) {
        changed.push({ id: newNode.id ?? oldNode.id, old: oldNode, new: newNode });
      }
    } else if (oldNode) {
      removed.push(oldNode);
    } else if (newNode) {
      added.push(newNode);
    }
  }

  const same = added.length === 0 && removed.length === 0 && changed.length === 0;
  return { same, nodes: { added, removed, changed } };
}

function nodesAreEqual(a, b) {
  if (a.k !== b.k) return false;
  // The stored Thorm IR subtree carries no node ids, while the DOM-serialized
  // IR does. Only compare ids when both are present.
  if (a.id !== undefined && b.id !== undefined && a.id !== b.id) return false;
  if (a.tag && b.tag && a.tag !== b.tag) return false;
  if (a.k === 'text') {
    if (textValue(a.value) !== textValue(b.value)) return false;
  }
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
  // Normalize both sides to the same canonical shape so that missing, null,
  // and empty prop groups compare as equal. The stored Thorm IR subtree omits
  // `cls` when null and may omit keys entirely, while the DOM-serialized IR
  // always emits all groups. We compare only the content-relevant groups
  // (attrs, cls, style) and ignore the `on` handler list.
  const aAttrs = normalizeGroup(a && a.attrs);
  const bAttrs = normalizeGroup(b && b.attrs);
  const aCls = normalizeCls(a && a.cls);
  const bCls = normalizeCls(b && b.cls);
  const aStyle = normalizeGroup(a && a.style);
  const bStyle = normalizeGroup(b && b.style);

  if (!deepEqual(aAttrs, bAttrs)) return false;
  if (aCls !== bCls) return false;
  if (!deepEqual(aStyle, bStyle)) return false;
  return true;
}

/**
 * Normalize an attrs/style group to a plain object. Thorm serializes an empty
 * attrs/style group as an empty array (`[]`) but a non-empty one as an object
 * (`{name: ...}`). The DOM-serialized IR always uses an object. Treat empty
 * arrays and empty objects as equivalent.
 */
function normalizeGroup(value) {
  if (value == null) return {};
  if (Array.isArray(value)) {
    if (value.length === 0) return {};
    // A non-empty array of [name, value] pairs — convert to an object.
    const out = {};
    for (const pair of value) {
      if (Array.isArray(pair) && pair.length >= 2) out[pair[0]] = pair[1];
    }
    return out;
  }
  return value;
}

/**
 * Normalize a class value (missing/null → '').
 */
function normalizeCls(value) {
  if (value == null) return '';
  return String(value);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
