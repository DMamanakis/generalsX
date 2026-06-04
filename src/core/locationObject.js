import { TERRAIN_EMPTY } from './constants'

/**
 * Build a location object from an index and current game state.
 * @param {number} locationIdx - Flat tile index
 * @param {object} game - Current game state
 * @returns {object} Location object with derived flags
 */
export function makeLocationObject(locationIdx, game) {
  const terrain = game.terrain[locationIdx]
  const isTeam = game.teams ? game.teams[terrain] === game.team : false
  return {
    idx: locationIdx,
    armies: game.armies[locationIdx],
    terrain,
    isMine: terrain === game.playerIndex,
    isTeam,
    attackable: terrain === TERRAIN_EMPTY || (terrain > TERRAIN_EMPTY && terrain !== game.playerIndex && !isTeam),
    isCity: game.knownCities.includes(locationIdx),
    isGeneral: game.opponents.some(
      opponent => opponent && opponent !== -1 && opponent.generalLocationIndex === locationIdx && !opponent.dead
    ),
  }
}

/**
 * Look up an existing location object from game.locationObjectMap by index.
 * @param {object} params
 * @param {number} params.locationIdx - Flat tile index
 * @param {object} params.game - Current game state (must have locationObjectMap)
 * @returns {object} Location object
 */
export function getLocationObject({locationIdx, game}) {
  if (!game) {
    throw new Error('getLocationObject requires game context')
  }
  return game.locationObjectMap[Math.floor(locationIdx / game.mapWidth)][locationIdx % game.mapWidth]
}
