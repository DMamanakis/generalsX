/**
 * testHelper.js
 * Provides configurable known game states for automated testing of bot logic.
 */

import { buildGameMap } from '../core/gameMap'

export const gameDefaults = {
  map: [],
  generals: [],
  cities: [],
  knownCities: [],
  armies: [],
  terrain: [],
  mapWidth: 5,
  mapHeight: 5,
  mapSize: 25,
  myGeneralLocationIndex: 6,
  playerIndex: 1,
  opponents: [{color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9}],
  team: null,
  teams: null, // null = FFA (no teams), avoids null===null team confusion
  myScore: {total: 25, tiles: 2},
  turn: 25,
  gameOver: false,
  socket: {emit: jest.fn()},
}

// prettier-ignore
const armyOptions = {
  allArmiesOnGeneral: [
    -1, -1, -1, -1, -1,
    -1, 25, -1, -1, -1,
     1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
  ],
  twoLargeArmies: [
    -1, -1, -1, -1, -1,
    -1, 15, -1, -1, -1,
    10, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
  ],
  cornerArmies: [
     5,  5, -1, -1, -1,
     5,  5,  5, -1, -1,
    -1,  5, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
  ],
  spread: [
     2,  2,  2, -1, -1,
    -1,  2,  2, -1, -1,
    -1, -1,  2, -1, -1,
    -1, -1, -1,  2, -1,
    -1, -1, -1, -1,  2,
  ],
}

// prettier-ignore
const terrainOptions = {
  empty: [
    -1, -1, -1, -1, -1,
    -1,  1, -1, -1, -1,
     1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1,  0,
  ],
  mountainous: [
    -1, -1, -1, -1, -1,
    -1,  1, -1, -2, -1,
     1, -1, -2, -1, -1,
    -1, -1, -1, -1, -2,
    -1, -1, -2, -1,  0,
  ],
  foggy: [
    -1, -1, -1, -1, -1,
    -1,  1, -1, -1, -1,
     1, -1, -1, -1, -1,
    -1, -1, -1, -3, -3,
    -1, -1, -1, -3, -3,
  ],
  occupiedCorner: [
     1,  1, -1, -1, -1,
     1,  1,  1, -1, -1,
    -1,  1, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
  ],
  withOpponent: [
    -1, -1, -1, -1, -1,
    -1,  1, -1, -1, -1,
     1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1,
    -1, -1, -1, -1,  0,
  ],
}

/**
 * Initialize a test game state with specified terrain and army configurations.
 * Automatically builds locationObjectMap and locations flat array.
 * @param {string} terrainMode - One of 'empty', 'mountainous', 'foggy', 'occupiedCorner', 'withOpponent'
 * @param {string} armyMode - One of 'allArmiesOnGeneral', 'twoLargeArmies', 'cornerArmies', 'spread'
 * @returns {object|null} Initialized game state, or null if invalid options
 */
export function initializeGameState(terrainMode, armyMode) {
  const game = {
    ...gameDefaults,
    opponents: [{color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9}],
    socket: {emit: jest.fn()},
  }

  game.terrain = [...terrainOptions[terrainMode]]
  game.armies = [...armyOptions[armyMode]]

  if (!game.terrain || !game.armies) {
    console.warn(`Unrecognized game option(s): ${terrainMode}, ${armyMode}`)
    return null
  }

  buildGameMap(game)
  return game
}
