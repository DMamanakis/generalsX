/**
 * Formats the current game state into a token-efficient text prompt for Claude.
 *
 * Designed to give Claude the strategic information it needs without token waste:
 * - Score comparison (am I winning?)
 * - Enemy general visibility (can I strike?)
 * - Threat level (is my crown at risk?)
 * - Current foreign policy (what has the rules engine decided?)
 * - Active weights and memory stats (learn from history)
 */
import { getMemoryStats } from './aiMemory'

/**
 * Format game state into a compact Claude prompt.
 *
 * @param {object} game - Game state object
 * @param {object} intel - Current intel (from framework.intel after move())
 * @param {string} foreignPolicy - Current FOREIGN_POLICY value
 * @param {{ attack, expand, defend }} weights - Current active weights
 * @param {object} memory - AiBot memory (for historical context)
 * @returns {string}
 */
export function formatGameState(game, intel, foreignPolicy, weights, memory) {
  const score = game.myScore || { total: 0, tiles: 0 }
  const stats = getMemoryStats(memory)

  const liveOpponents = (game.opponents || [])
    .filter(opp => opp && opp !== -1 && !opp.dead)

  const knownGenerals = liveOpponents.filter(o => o.generalLocationIndex > -1)
  const threats = (intel.threats || []).length
  const topArmy = intel.myTopArmies?.[0]?.armies ?? 0

  const pct = w => `${(w * 100).toFixed(0)}%`

  return [
    `Turn ${game.turn} | My score: ${score.total} armies / ${score.tiles} tiles`,
    `Top army: ${topArmy} | Enemies alive: ${liveOpponents.length} | Known enemy generals: ${knownGenerals.length}`,
    `Threats near my crown: ${threats} | Rules-engine policy: ${foreignPolicy}`,
    `Active weights: attack=${pct(weights.attack)} expand=${pct(weights.expand)} defend=${pct(weights.defend)}`,
    `History (${stats.gamesPlayed} games, ${stats.winRate} win rate) — learned best: ${stats.weights}`,
  ].join('\n')
}
