/**
 * Apply a generals.io diff patch to an array.
 *
 * The diff alternates between matching-segment lengths and mismatching-segment data:
 *   [matchCount, mismatchCount, ...mismatchData, matchCount, ...]
 *
 * Example: patch([0, 0], [1, 1, 3]) → [0, 3]
 * Example: patch([0, 0], [0, 1, 2, 1]) → [2, 0]
 *
 * @param {Array} old - Previous state array
 * @param {Array} diff - Diff array from the server
 * @returns {Array} New state array
 */
export function patch(old, diff) {
  const out = []
  let i = 0
  while (i < diff.length) {
    if (diff[i]) {
      Array.prototype.push.apply(out, old.slice(out.length, out.length + diff[i]))
    }
    i++
    if (i < diff.length && diff[i]) {
      Array.prototype.push.apply(out, diff.slice(i + 1, i + 1 + diff[i]))
      i += diff[i]
    }
    i++
  }
  return out
}
