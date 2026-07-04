import { findNeighbors } from '../utils/neighbors'
import { TERRAIN_EMPTY } from '../core/constants'
import { getLocationObject } from '../core/locationObject'
import { getMyCities } from './cityIntel'

/**
 * Return neighbors of a location that are enemy-owned — not empty, not mine, not a teammate.
 * @param {object} location
 * @param {object} game
 * @returns {Array}
 */
function findEnemyNeighbors(location, game) {
  return findNeighbors({location, game}).filter(neighbor => {
    if (neighbor.terrain <= TERRAIN_EMPTY || neighbor.terrain === game.playerIndex) return false
    return !(game.teams && game.teams[neighbor.terrain] === game.team)
  })
}

/**
 * Threat: an enemy directly adjacent to our general.
 * @param {object} generalLocation
 * @param {object} game
 * @returns {Array} One threat per adjacent enemy tile
 */
function detectGeneralAdjacencyThreats(generalLocation, game) {
  return findEnemyNeighbors(generalLocation, game).map(neighbor => ({
    location: neighbor,
    type: 'ADJACENT_TO_GENERAL',
    urgency: 'HIGH',
  }))
}

/**
 * Threat: a known enemy general within 6 Manhattan distance of ours.
 * @param {object} game
 * @returns {Array}
 */
function detectGeneralProximityThreats(game) {
  const threats = []
  const myRow = Math.floor(game.myGeneralLocationIndex / game.mapWidth)
  const myCol = game.myGeneralLocationIndex % game.mapWidth

  for (let playerIdx = 0; playerIdx < game.opponents.length; playerIdx++) {
    const opp = game.opponents[playerIdx]
    if (!opp || opp === -1 || opp.dead || opp.generalLocationIndex <= -1) continue

    const oppRow = Math.floor(opp.generalLocationIndex / game.mapWidth)
    const oppCol = opp.generalLocationIndex % game.mapWidth
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

/**
 * Threat: an enemy directly adjacent to a city we own. Cities are valuable army
 * producers, worth defending even though losing one isn't game-ending like the general.
 * @param {object} game
 * @returns {Array} One threat per adjacent enemy tile, per threatened city
 */
function detectCityAdjacencyThreats(game) {
  const threats = []
  for (const cityIdx of getMyCities(game)) {
    const cityLocation = getLocationObject({locationIdx: cityIdx, game})
    if (!cityLocation) continue

    threats.push(...findEnemyNeighbors(cityLocation, game).map(() => ({
      location: cityLocation,
      cityIdx,
      type: 'ADJACENT_TO_CITY',
      urgency: 'MEDIUM',
    })))
  }
  return threats
}

/**
 * Detect immediate and nearby threats to our general, plus any of our cities.
 * @param {object} game - Current game state
 * @returns {Array} Array of threat objects
 */
export function detectThreats(game) {
  if (!game.myGeneralLocationIndex || !game.locationObjectMap) return []

  const row = Math.floor(game.myGeneralLocationIndex / game.mapWidth)
  const col = game.myGeneralLocationIndex % game.mapWidth
  const generalLocation = game.locationObjectMap[row] && game.locationObjectMap[row][col]
  if (!generalLocation) return []

  return [
    ...detectGeneralAdjacencyThreats(generalLocation, game),
    ...detectGeneralProximityThreats(game),
    ...detectCityAdjacencyThreats(game),
  ]
}
