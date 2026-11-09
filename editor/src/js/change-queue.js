/**
 * Phase 2 — Change Queue.
 *
 * Batches per-block IR replacements and sends them every 60 s.
 * Falls back to localStorage on failure.
 */

import { diffIR } from './ir-parser.js';
import { saveChanges } from './save.js';

const FLUSH_INTERVAL = 60000;
const STORAGE_KEY = '__editorChangeQueue';

let queue = [];
let flushTimer = null;
let pending = false;

/**
 * Load the persisted queue from localStorage.
 */
export function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      queue = JSON.parse(raw);
    }
  } catch (e) {
    queue = [];
  }
}

/**
 * Persist the queue to localStorage.
 */
function persistQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    // localStorage may be unavailable
  }
}

/**
 * Enqueue a change for a block.
 * @param {{ blockId: string, ir: Array, type?: string }} change
 */
export function enqueueChange(change) {
  // Check if this block already has a pending change
  const existingIdx = queue.findIndex((c) => c.blockId === change.blockId);
  if (existingIdx >= 0) {
    // Only update if the IR actually changed
    const diff = diffIR(queue[existingIdx].ir, change.ir);
    if (!diff.same) {
      queue[existingIdx] = change;
    }
  } else {
    queue.push(change);
  }
  persistQueue();
  scheduleFlush();
}

/**
 * Remove a change for a block (e.g., after undo).
 * @param {string} blockId
 */
export function removeChange(blockId) {
  queue = queue.filter((c) => c.blockId !== blockId);
  persistQueue();
}

/**
 * Get the current queue.
 */
export function getQueue() {
  return [...queue];
}

/**
 * Manually trigger a flush.
 * @returns {Promise<object>}
 */
export async function flushQueue() {
  if (pending || queue.length === 0) {
    return { flushed: 0, queued: queue.length };
  }
  pending = true;
  const snapshot = [...queue];
  const result = await saveChanges(snapshot);
  if (result.ok) {
    queue = [];
  }
  persistQueue();
  pending = false;
  return {
    flushed: result.saved || 0,
    queued: queue.length,
  };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_INTERVAL);
}

/**
 * Clear the queue and timer.
 */
export function clearQueue() {
  queue = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  persistQueue();
}
