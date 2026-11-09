/**
 * Phase 2 — Save client.
 *
 * HTTP POST client for the save endpoint.
 * POST /api/editor/{docId}
 */

/**
 * Send changes to the server.
 * @param {Array<{ blockId: string, ir: Array, type?: string }>} changes
 * @param {string} [docId]
 * @returns {Promise<{ ok: boolean, saved?: number, error?: string }>}
 */
export async function saveChanges(changes, docId) {
  if (!docId) {
    docId = getDocId();
  }
  if (!docId) {
    return { ok: false, error: 'no docId' };
  }
  try {
    const response = await fetch(`/api/editor/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    return {
      ok: response.ok,
      saved: data.saved || 0,
      error: data.error || (response.ok ? undefined : `HTTP ${response.status}`),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Extract docId from the current URL path.
 * Expected path: /editor/{id}/...
 * @returns {string|null}
 */
export function getDocId() {
  const path = window.location.pathname;
  const match = path.match(/\/editor\/([^\/]+)/);
  return match ? match[1] : null;
}
