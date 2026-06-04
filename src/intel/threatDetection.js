import { findNeighbors } from '../utils/neighbors'
import { TERRAIN_EMPTY } from '../core/constants'

/**
 * Detect immediate and nearby threats to our general.
 * @param {object} game - Current game state
 * @returns {Array} Array of threat objects
 */
export function detectThreats(game) {
  const threats = []
  if (!game.myGeneralLocationIndex || !game.locationObjectMap) return threats

  const row = Math.floor(game.myGeneralLocationIndex / game.mapWidth)
  const col = game.myGeneralLocationIndex % game.mapWidth
  const generalLocation = game.locationObjectMap[row] && game.locationObjectMap[row][col]

  if (!generalLocation) return threats

  // Threat 1: Enemy directly adjacent to our general
  const neighbors = findNeighbors({location: generalLocation, game})
  for (const neighbor of neighbors) {
    if (neighbor.terrain > TERRAIN_EMPTY && neighbor.terrain !== game.playerIndex) {
      const isTeam = game.teams && game.teams[neighbor.terrain] === game.team
      if (!isTeam) {
        threats.push({
          location: neighbor,
          type: 'ADJACENT_TO_GENERAL',
          urgency: 'HIGH',
        })
      }
    }
  }

  // Threat 2: Known enemy general within 6 Manhattan distance
  for (let playerIdx = 0; playerIdx < game.opponents.length; playerIdx++) {
    const opp = game.opponents[playerIdx]
    if (!opp || opp === -1 || opp.dead || opp.generalLocationIndex <= -1) continue

    const oppRow = Math.floor(opp.generalLocationIndex / game.mapWidth)
    const oppCol = opp.generalLocationIndex % game.mapWidth
    const myRow = Math.floor(game.myGeneralLocationIndex / game.mapWidth)
    const myCol = game.myGeneralLocationIndex % game.mapWidth
    const distance = Math.abs(oppRow - myRow) + Math.abs(oppCol - myCol)

    if (distance <= 6) {
      threats.push({
        playerIndex: playerIdx,
        location: opp.generalLocationIndex,
        type: 'ENEMY_GENERAL_NEARBY',
        urgency: distance <= 3 ? 'CRITICAL' : 'MEDIUM',
        distance,
      })
    }
  }

  return threats
}
