const EARLY_GAME_TURN_THRESHOLD = 100

export const FOREIGN_POLICY = {
  EXPLORE: 'EXPLORE',
  EXPAND: 'EXPAND',
  MDK: 'MDK',
  DEFEND: 'DEFEND',
  CONSOLIDATE: 'CONSOLIDATE',
  THREATENED: 'THREATENED',
}

/**
 * Determine the overall strategic posture for this turn.
 * EXPLORE  → early game, gather information
 * EXPAND   → undiscovered, grow territory
 * MDK      → found enemy general and we are stronger
 * DEFEND   → found enemy general and we are weaker
 * @param {object} game - Current game state
 * @param {object} intel - Gathered intel from intelGathering
 * @returns {string} One of the FOREIGN_POLICY constants
 */
export function determineForeignPolicy(game, intel) {
  if (game.turn <= EARLY_GAME_TURN_THRESHOLD) {
    return FOREIGN_POLICY.EXPLORE
  }

  if (intel.undiscovered) {
    return FOREIGN_POLICY.EXPAND
  }

  let policy = FOREIGN_POLICY.EXPAND
  let foundGeneral = false

  for (let playerIdx = 0; playerIdx < game.generals.length; playerIdx++) {
    const generalIdx = game.generals[playerIdx]
    if (generalIdx > -1 && game.opponents[playerIdx] && !game.opponents[playerIdx].dead) {
      // Skip teammates — their general is known but they are not targets
      if (game.teams && game.teams[playerIdx] === game.team) continue

      foundGeneral = true
      const opponent = game.opponents[playerIdx]
      if (game.myScore && game.myScore.total >= opponent.total) {
        policy = FOREIGN_POLICY.MDK
      } else {
        policy = FOREIGN_POLICY.DEFEND
      }
    }
  }

  if (!foundGeneral) {
    policy = FOREIGN_POLICY.EXPAND
  }

  return policy
}
