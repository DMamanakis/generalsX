/**
 * Rank living opponents by vulnerability (weakest/most exploitable first).
 * @param {object} game - Current game state
 * @returns {Array} Sorted array of opponent data objects
 */
export function rankOpponents(game) {
  return game.opponents
    .filter(opp => opp && opp !== -1 && !opp.dead)
    .map((opp, idx) => ({
      ...opp,
      playerIndex: idx,
      hasKnownGeneral: typeof opp.generalLocationIndex !== 'undefined' && opp.generalLocationIndex > -1,
      armyEfficiency: opp.tiles > 0 ? opp.total / opp.tiles : 0,
    }))
    .sort((a, b) => a.total - b.total) // Weakest first
}

/**
 * Find the most vulnerable opponent (fewest total armies).
 * @param {object} game - Current game state
 * @returns {object|null} Most vulnerable opponent or null
 */
export function getMostVulnerableOpponent(game) {
  const ranked = rankOpponents(game)
  return ranked.length > 0 ? ranked[0] : null
}

/**
 * Find the opponent whose general is known.
 * @param {object} game - Current game state
 * @returns {object|null} Opponent with known general, or null
 */
export function getOpponentWithKnownGeneral(game) {
  const ranked = rankOpponents(game)
  return ranked.find(opp => opp.hasKnownGeneral) || null
}
