import { makeLocationObject } from './locationObject'

/**
 * (Re)build game.locations and game.locationObjectMap from current terrain/armies.
 * Should be called each turn before bot logic runs.
 * @param {object} game - Game state (mutated in place)
 */
export function buildGameMap(game) {
  game.locations = []
  game.locationObjectMap = []
  for (let row = 0; row < game.mapHeight; row++) {
    game.locationObjectMap[row] = []
    for (let col = 0; col < game.mapWidth; col++) {
      const idx = row * game.mapWidth + col
      const loc = makeLocationObject(idx, game)
      game.locations[idx] = loc
      game.locationObjectMap[row][col] = loc
    }
  }
}
