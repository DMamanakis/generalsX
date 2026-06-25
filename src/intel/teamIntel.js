import { findNeighbors } from '../utils/neighbors'
import { TERRAIN_EMPTY } from '../core/constants'

/**
 * Return information about the current player's living teammate, or null if none.
 * Returns null in FFA (game.teams is null/undefined).
 *
 * @param {object} game - Current game state
 * @returns {{ playerIndex, generalLocationIndex, total, tiles }|null}
 */
export function getTeammateInfo(game) {
  if (!game.teams || game.team == null) return null

  for (let playerIndex = 0; playerIndex < game.opponents.length; playerIndex++) {
    if (playerIndex === game.playerIndex) continue
    const opp = game.opponents[playerIndex]
    if (!opp || opp === -1 || opp.dead) continue
    if (game.teams[playerIndex] !== game.team) continue

    return {
      playerIndex,
      generalLocationIndex:
        typeof opp.generalLocationIndex !== 'undefined' && opp.generalLocationIndex > -1
          ? opp.generalLocationIndex
          : null,
      total: opp.total || 0,
      tiles: opp.tiles || 0,
    }
  }

  return null
}

/**
 * Return all empty (unowned) tiles that border teammate territory.
 * These are prime candidates for CaptureForTeammateStrategy — we can grab
 * them and immediately push armies onto the adjacent teammate tile.
 *
 * Only includes tiles with terrain === TERRAIN_EMPTY (not fogged, not enemy-owned).
 *
 * @param {object} game - Current game state (must have locationObjectMap + locations)
 * @returns {Array} Array of location objects
 */
export function getEmptyTilesAdjacentToTeammate(game) {
  if (!game.teams || game.team == null) return []

  const seen = new Set()
  const result = []

  for (const loc of game.locations) {
    if (!loc.isTeam) continue

    const neighbors = findNeighbors({location: loc, game})
    for (const n of neighbors) {
      if (seen.has(n.idx)) continue
      if (n.terrain === TERRAIN_EMPTY) {
        seen.add(n.idx)
        result.push(n)
      }
    }
  }

  return result
}
