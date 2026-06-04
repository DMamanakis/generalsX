import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { getLocationObject } from '../core/locationObject'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { createDistanceMap } from '../utils/pathfinding'

/**
 * CONSOLIDATE strategy: gather the largest outlying army back to the general.
 * Useful for turtling and defensive play.
 */
export class ConsolidateStrategy extends BaseStrategy {
  evaluate(game, intel) {
    return intel.myTopArmies.length > 0 &&
      game.myGeneralLocationIndex &&
      intel.myTopArmies.some(a => a.idx !== game.myGeneralLocationIndex)
  }

  generateMoves(game, intel) {
    const queue = []
    if (!game.myGeneralLocationIndex) return queue

    const general = getLocationObject({locationIdx: game.myGeneralLocationIndex, game})

    // Pick the army farthest from general by distance, excluding general itself
    const generalDistMap = createDistanceMap({location: general, game})
    const candidates = intel.myTopArmies.filter(a => a.idx !== game.myGeneralLocationIndex)
    if (!candidates.length) return queue

    const source = candidates.reduce((farthest, army) => {
      const farthestDist = typeof generalDistMap[farthest.idx] === 'number' ? generalDistMap[farthest.idx] : 0
      const armyDist = typeof generalDistMap[army.idx] === 'number' ? generalDistMap[army.idx] : 0
      return armyDist > farthestDist ? army : farthest
    }, candidates[0])

    const path = findPath({location: source, targetLocation: general, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'CONSOLIDATE',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.DEFEND,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
