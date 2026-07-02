/**
 * Formats the current game state into a token-efficient text prompt for the LLM.
 *
 * Designed to give the LLM the strategic information it needs without token waste:
 * - Score comparison (am I winning?)
 * - Enemy general visibility (can I strike?)
 * - Threat level (is my crown at risk?)
 * - Current foreign policy (what has the rules engine decided?)
 * - Active weights and memory stats (learn from history), both global and
 *   situational (this exact phase/parity bucket — see aiContext.js)
 * - Per-opponent breakdown for multiplayer target selection (focusTarget)
 * - Recent post-game lessons written by askReflection()
 */
import { getMemoryStats, getBucketStats, getLessons } from './aiMemory'
import { computeContextBucket, manhattanDistance } from './aiContext'
import { rankOpponents } from '../intel/opponentAnalysis'

/** Number of most-recent lessons to surface in the prompt */
const LESSONS_IN_PROMPT = 3

/**
 * Build one summary line per live, non-team opponent for target-selection context.
 * @param {object} game
 * @returns {string[]}
 */
function formatOpponentLines(game) {
  return rankOpponents(game).map(opp => {
    const dist = opp.hasKnownGeneral
      ? manhattanDistance(game.myGeneralLocationIndex, opp.generalLocationIndex, game.mapWidth)
      : null
    return `  #${opp.playerIndex} armies=${opp.total || 0} tiles=${opp.tiles || 0} ` +
      `gatherable=${opp.gatherableArmies || 0} eff=${(opp.armyEfficiency || 0).toFixed(1)} ` +
      `genKnown=${opp.hasKnownGeneral ? 'yes' : 'no'} dist=${dist ?? 'n/a'}`
  })
}

/**
 * Format game state into a compact prompt for the strategic LLM consult.
 *
 * @param {object} game - Game state object
 * @param {object} intel - Current intel (from framework.intel after move())
 * @param {string} foreignPolicy - Current FOREIGN_POLICY value
 * @param {{ attack, expand, defend }} weights - Current active weights
 * @param {object} memory - AiBot memory (for historical + situational context)
 * @returns {string}
 */
export function formatGameState(game, intel, foreignPolicy, weights, memory) {
  const score = game.myScore || { total: 0, tiles: 0 }
  const stats = getMemoryStats(memory)
  const bucket = computeContextBucket(game)
  const bucketStats = getBucketStats(memory, bucket)

  const liveOpponents = (game.opponents || [])
    .filter(opp => opp && opp !== -1 && !opp.dead)

  const knownGenerals = liveOpponents.filter(o => o.generalLocationIndex > -1)
  const threats = (intel.threats || []).length
  const topArmy = intel.myTopArmies?.[0]?.armies ?? 0

  const pct = w => `${(w * 100).toFixed(0)}%`

  const opponentLines = formatOpponentLines(game)
  const lessonLines = getLessons(memory, LESSONS_IN_PROMPT).map(l => `  [${l.result}] ${l.text}`)

  return [
    `Turn ${game.turn} | My score: ${score.total} armies / ${score.tiles} tiles`,
    `Top army: ${topArmy} | Enemies alive: ${liveOpponents.length} | Known enemy generals: ${knownGenerals.length}`,
    `Threats near my crown: ${threats} | Rules-engine policy: ${foreignPolicy}`,
    `Active weights: attack=${pct(weights.attack)} expand=${pct(weights.expand)} defend=${pct(weights.defend)}`,
    `History (${stats.gamesPlayed} games, ${stats.winRate} win rate) — learned best: ${stats.weights}`,
    `Situation "${bucket}" (${bucketStats.games} games, ${bucketStats.winRate} win rate)` +
      (bucketStats.weights ? ` — learned best: ${bucketStats.weights}` : ''),
    ...(opponentLines.length ? ['Opponents (idx armies tiles gatherable efficiency generalKnown distance):', ...opponentLines] : []),
    ...(lessonLines.length ? ['Lessons from past games:', ...lessonLines] : []),
  ].join('\n')
}
