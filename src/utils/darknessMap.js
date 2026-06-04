import { TERRAIN_MTN } from '../core/constants'
import { findNeighbors } from './neighbors'

/**
 * Build a darkness map measuring BFS distance from any currently-visible tile.
 * Higher values = deeper into unexplored territory.
 * @param {object} game - Current game state (must have locations array)
 * @returns {Array} Darkness values indexed by tile index
 */
export function createDarknessMap(game) {
  if (!game) {
    throw new Error('createDarknessMap requires game context')
  }
  const darknessMap = []
  const queue = []

  // Seed all currently-visible tiles (terrain >= TERRAIN_MTN means visible)
  const visible = game.locations.filter(loc => loc.terrain >= TERRAIN_MTN)
  for (let v = 0; v < visible.length; v++) {
    darknessMap[visible[v].idx] = 0
    queue.push(visible[v])
  }

  while (queue.length > 0) {
    const current = queue.shift()
    const darkness = darknessMap[current.idx]
    const neighbors = findNeighbors({location: current, game})

    for (let i = 0; i < neighbors.length; i++) {
      if (typeof darknessMap[neighbors[i].idx] === 'undefined') {
        queue.push(neighbors[i])
        darknessMap[neighbors[i].idx] = darkness + 1
      }
    }
  }

  return darknessMap
}
