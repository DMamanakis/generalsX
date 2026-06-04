import { TERRAIN_FOG, TERRAIN_EMPTY } from '../core/constants'
import { getLocationObject } from '../core/locationObject'
import { findNeighbors } from './neighbors'
import { getArmyAttackDiff } from './combat'

/**
 * Build a BFS distance map from a source location.
 * Mountains are marked 'M', cities (when noCities=true) marked 'C'.
 * @param {object} params
 * @param {object|number} params.location - Source location object or index
 * @param {object} params.game - Current game state
 * @param {boolean} [params.noCities] - If true, treat cities as impassable
 * @returns {Array} Distance map indexed by tile index
 */
export function createDistanceMap({location, game, noCities}) {
  if (!game) {
    throw new Error('createDistanceMap requires game context')
  }
  location = location.idx !== undefined ? location : getLocationObject({locationIdx: location, game})
  const distanceMap = []
  const queue = [location]
  distanceMap[location.idx] = 0

  while (queue.length > 0) {
    const current = queue.shift()
    const currentDist = distanceMap[current.idx]

    if (currentDist === 'M' || currentDist === 'C') {
      continue
    }

    const neighbors = findNeighbors({location: current, game})
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i]
      if (typeof distanceMap[neighbor.idx] !== 'undefined') {
        continue
      }
      queue.push(neighbor)
      if (noCities && game.knownCities.includes(neighbor.idx)) {
        distanceMap[neighbor.idx] = 'C'
      } else if (neighbor.terrain === TERRAIN_FOG || neighbor.terrain >= TERRAIN_EMPTY || game.knownCities.includes(neighbor.idx)) {
        distanceMap[neighbor.idx] = currentDist + 1
      } else {
        distanceMap[neighbor.idx] = 'M'
      }
    }
  }

  return distanceMap
}

/**
 * Recursively follow the distance map from target back to source,
 * building a path array (index 0 = target, last index = source).
 * Ties broken by army differential in favor of better attack positions.
 * @param {object} params
 * @param {Array} params.distanceMap - BFS distance map from source
 * @param {object|Array} params.targetLocationOrPath - Target location or in-progress path
 * @param {object} params.game - Current game state
 * @returns {Array} Path as array of location objects
 */
export function findShortestPath({distanceMap, targetLocationOrPath, game}) {
  if (!game) {
    throw new Error('findShortestPath requires game context')
  }
  let path = []
  if (Array.isArray(targetLocationOrPath)) {
    path = targetLocationOrPath
  } else {
    path.push(targetLocationOrPath)
  }

  const lastInPath = path[path.length - 1]
  const neighbors = findNeighbors({location: lastInPath, game})
  let chosenPath = lastInPath
  let reachable = false

  for (let i = 0; i < neighbors.length; i++) {
    const n = neighbors[i]
    if (distanceMap[n.idx] !== undefined &&
        distanceMap[n.idx] !== 'C' &&
        distanceMap[n.idx] !== 'M' &&
        distanceMap[chosenPath.idx] !== undefined &&
        distanceMap[chosenPath.idx] !== 'C' &&
        distanceMap[chosenPath.idx] !== 'M') {
      reachable = true
      break
    }
  }

  if (reachable) {
    for (let i = 0; i < neighbors.length; i++) {
      const candidate = neighbors[i]
      const candidateDist = distanceMap[candidate.idx]
      const chosenDist = distanceMap[chosenPath.idx]

      if (typeof candidateDist === 'number' && typeof chosenDist === 'number' && candidateDist < chosenDist) {
        chosenPath = candidate
      } else if (candidateDist === chosenDist &&
          getArmyAttackDiff(lastInPath, candidate, game) > getArmyAttackDiff(lastInPath, chosenPath, game)) {
        chosenPath = candidate
      }
    }
  } else {
    // Bug fix: original pathContains() never returned value — fixed here
    function pathContains(loc) {
      for (let i = 0; i < path.length; i++) {
        if (path[i] === loc) return true
      }
      return false
    }

    if (neighbors[0] && !pathContains(neighbors[0])) {
      chosenPath = neighbors[0]
    } else if (neighbors[1] && !pathContains(neighbors[1])) {
      chosenPath = neighbors[1]
    } else if (neighbors[2] && !pathContains(neighbors[2])) {
      chosenPath = neighbors[2]
    } else if (neighbors[3] && !pathContains(neighbors[3])) {
      chosenPath = neighbors[3]
    }
  }

  if (chosenPath !== lastInPath) {
    path.push(chosenPath)
    path = findShortestPath({distanceMap, targetLocationOrPath: path, game})
  }

  return path
}

/**
 * Find a path between two locations using BFS distance mapping.
 * Returns path as array of location objects, index 0 = target, last = source.
 * To queue moves in order, iterate from length-1 down to 1.
 * @param {object} params
 * @param {object|number} params.location - Source location or index
 * @param {object|number} params.targetLocation - Target location or index
 * @param {object} params.game - Current game state
 * @param {boolean} [params.noCities] - If true, avoid cities
 * @returns {Array} Path as array of location objects
 */
export function findPath({location, targetLocation, game, noCities}) {
  if (!game) {
    throw new Error('findPath requires game context')
  }
  targetLocation = targetLocation.idx !== undefined ? targetLocation : getLocationObject({locationIdx: targetLocation, game})
  location = location.idx !== undefined ? location : getLocationObject({locationIdx: location, game})

  if (!location || !targetLocation) return []

  const distanceMap = createDistanceMap({location, game, noCities})
  return findShortestPath({distanceMap, targetLocationOrPath: targetLocation, game})
}
