/**
 * Return the up-to-4 orthogonal neighbors of a location.
 * @param {object} params
 * @param {object|number} params.location - Location object or flat index
 * @param {object} params.game - Current game state (must have locationObjectMap)
 * @returns {Array} Array of neighboring location objects
 */
export function findNeighbors({location, game}) {
  if (!game) {
    throw new Error('findNeighbors requires game context')
  }
  const idx = location.idx !== undefined ? location.idx : location
  const row = Math.floor(idx / game.mapWidth)
  const col = idx % game.mapWidth
  const neighbors = []

  if (game.locationObjectMap[row - 1] && game.locationObjectMap[row - 1][col]) {
    neighbors.push(game.locationObjectMap[row - 1][col])
  }
  if (game.locationObjectMap[row + 1] && game.locationObjectMap[row + 1][col]) {
    neighbors.push(game.locationObjectMap[row + 1][col])
  }
  if (game.locationObjectMap[row] && game.locationObjectMap[row][col - 1]) {
    neighbors.push(game.locationObjectMap[row][col - 1])
  }
  if (game.locationObjectMap[row] && game.locationObjectMap[row][col + 1]) {
    neighbors.push(game.locationObjectMap[row][col + 1])
  }

  return neighbors
}
