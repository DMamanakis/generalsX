/**
 * Rank living, non-teammate opponents by vulnerability (weakest/most exploitable first).
 * @param {object} game - Current game state
 * @returns {Array} Sorted array of opponent data objects with playerIndex, hasKnownGeneral, armyEfficiency
 */
export function rankOpponents(game) {
  return game.opponents
    .reduce((acc, opp, playerIndex) => {
      // Guard: skip dead, missing, sentinel (-1), and teammate entries
      if (!opp || opp === -1 || opp.dead) return acc
      if (game.teams && game.teams[playerIndex] === game.team) return acc
      acc.push({
        ...opp,
        playerIndex,
        hasKnownGeneral: typeof opp.generalLocationIndex !== 'undefined' && opp.generalLocationIndex > -1,
        armyEfficiency: opp.tiles > 0 ? opp.total / opp.tiles : 0,
      })
      return acc
    }, [])
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
 * Find the weakest opponent whose general location is known.
 * @param {object} game - Current game state
 * @returns {object|null} Weakest opponent with known general, or null
 */
export function getOpponentWithKnownGeneral(game) {
  const ranked = rankOpponents(game)
  return ranked.find(opp => opp.hasKnownGeneral) || null
}
