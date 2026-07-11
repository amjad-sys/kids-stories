/**
 * visibility-core.js — Pure story-part visibility filtering.
 * Mirrors the existing RTDB rule: settings/visibility/{storyId}_part{n} === false hides
 * a part; absence means visible (Req 7.6). No Firebase, no DOM.
 */

/** Sentinel returned when a requested part resolves to no visible part. */
export const STORY_LISTING = Symbol('story-listing');

function visibilityKey(storyId, index) {
  return storyId + '_part' + (index + 1);
}

/**
 * filterVisibleParts — return parts not explicitly hidden, preserving order.
 *
 * @param {string} storyId
 * @param {Array} parts
 * @param {Object<string,boolean>} visibilityMap  keyed by `${storyId}_part${n}`
 * @returns {Array} visible parts (original objects, original order)
 */
export function filterVisibleParts(storyId, parts, visibilityMap) {
  const map = visibilityMap || {};
  const list = Array.isArray(parts) ? parts : [];
  return list.filter((_part, index) => map[visibilityKey(storyId, index)] !== false);
}

/**
 * resolveRequestedPart — resolve a requested original-index into a visible part.
 * If the requested part is visible, return it. Otherwise return the next visible
 * part at or after the requested index, then before it; if none remain, return
 * the STORY_LISTING sentinel (Req 7.4, 7.5).
 *
 * @returns {{part:any, index:number} | typeof STORY_LISTING}
 */
export function resolveRequestedPart(storyId, parts, visibilityMap, index) {
  const map = visibilityMap || {};
  const list = Array.isArray(parts) ? parts : [];
  const isVisible = (i) => list[i] !== undefined && map[visibilityKey(storyId, i)] !== false;

  if (index >= 0 && index < list.length && isVisible(index)) {
    return { part: list[index], index };
  }
  for (let i = index + 1; i < list.length; i++) {
    if (isVisible(i)) return { part: list[i], index: i };
  }
  for (let i = Math.min(index - 1, list.length - 1); i >= 0; i--) {
    if (isVisible(i)) return { part: list[i], index: i };
  }
  return STORY_LISTING;
}
