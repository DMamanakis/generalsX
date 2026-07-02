/**
 * Computes a coarse situational bucket for the current game state, used to key
 * conditional strategy weights in aiMemory instead of one global average.
 *
 * Kept to two low-cardinality dimensions (phase x parity = 9 buckets max) so each
 * bucket can accumulate enough games to be statistically meaningful given
 * aiMemory's 50-game retention window. Finer dimensions (e.g. opponent count) are
 * a natural follow-up once data volume supports them.
 */
import { rankOpponents } from '../intel/opponentAnalysis'

/** Turn thresholds separating game phases */
const PHASE_MID_START = 100
const PHASE_LATE_START = 250

/** Army-total ratios (mine / strongest live opponent) separating parity buckets */
const PARITY_AHEAD_RATIO = 1.2
const PARITY_BEHIND_RATIO = 0.83

/**
 * Classify the current turn into a coarse game phase.
 * @param {number} turn
 * @returns {'early'|'mid'|'late'}
 */
function classifyPhase(turn) {
  if (turn < PHASE_MID_START) return 'early'
  if (turn < PHASE_LATE_START) return 'mid'
  return 'late'
}

/**
 * Classify our army total relative to the strongest live, non-team opponent.
 * @param {object} game
 * @returns {'ahead'|'even'|'behind'}
 */
function classifyParity(game) {
  const myTotal = game.myScore?.total || 0
  const ranked = rankOpponents(game) // sorted weakest -> strongest by total
  if (!ranked.length) return 'even'

  const strongest = ranked[ranked.length - 1].total || 0
  if (strongest <= 0) return 'even'

  const ratio = myTotal / strongest
  if (ratio > PARITY_AHEAD_RATIO) return 'ahead'
  if (ratio < PARITY_BEHIND_RATIO) return 'behind'
  return 'even'
}

/**
 * Compute a situational bucket key for the current game state, e.g. "mid|behind".
 * Used to look up/record conditional strategy weights in aiMemory.
 * @param {object} game
 * @returns {string}
 */
export function computeContextBucket(game) {
  return `${classifyPhase(game.turn)}|${classifyParity(game)}`
}

/**
 * Manhattan distance between two flat tile indices on the map grid.
 * @param {number} idxA
 * @param {number} idxB
 * @param {number} width - game.mapWidth
 * @returns {number|null} null when either index or the width is invalid
 */
export function manhattanDistance(idxA, idxB, width) {
  if (idxA == null || idxB == null || idxA < 0 || idxB < 0 || !width) return null
  const rowA = Math.floor(idxA / width)
  const colA = idxA % width
  const rowB = Math.floor(idxB / width)
  const colB = idxB % width
  return Math.abs(rowA - rowB) + Math.abs(colA - colB)
}