import { BaseStrategy } from './BaseStrategy'
import { createDarknessMap } from '../utils/darknessMap'
import { findPath } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'

/**
 * EXPLORE strategy: move the largest army toward the darkest (most unexplored) area.
 */
export class ExploreStrategy extends BaseStrategy {
  evaluate(game, intel) {
    return intel.myTopArmies.length > 0 &&
      (intel.foggedTerritories.length > 0 || intel.unexploredTerritories.size > 0)
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const darknessMap = createDarknessMap(game)

    // Find the tile with the highest darkness value (deepest into fog)
    let highestDarkness = -1
    let highestDarknessIdx = -1
    for (let i = 0; i < darknessMap.length; i++) {
      if (typeof darknessMap[i] === 'number' && darknessMap[i] > highestDarkness) {
        highestDarkness = darknessMap[i]
        highestDarknessIdx = i
      }
    }

    if (highestDarknessIdx === -1) return queue

    const source = intel.myTopArmies[0]
    const path = findPath({location: source, targetLocation: highestDarknessIdx, game, noCities: true})

    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'EXPLORE',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.EXPLORE,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
