import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { getLocationObject } from '../core/locationObject'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { createDistanceMap } from '../utils/pathfinding'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'
import { getDefenseTarget } from '../intel/cityIntel'

/**
 * CONSOLIDATE strategy: gather the largest outlying army back to the general — or, absent
 * a general threat, back to a city we own that's under threat (see cityIntel.getDefenseTarget).
 * Only fires during DEFEND — pulling armies home is a defensive maneuver and would
 * waste offensive momentum in any other phase.
 */
export class ConsolidateStrategy extends BaseStrategy {
  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy !== FOREIGN_POLICY.DEFEND) return false
    return intel.myTopArmies.length > 0 &&
      game.myGeneralLocationIndex &&
      intel.myTopArmies.some(a => a.idx !== game.myGeneralLocationIndex)
  }

  generateMoves(game, intel) {
    const queue = []
    if (!game.myGeneralLocationIndex) return queue

    const target = getLocationObject({locationIdx: getDefenseTarget(game, intel), game})

    // Pick the army farthest from the target by distance, excluding the general itself
    const targetDistMap = createDistanceMap({location: target, game})
    const candidates = intel.myTopArmies.filter(a => a.idx !== game.myGeneralLocationIndex)
    if (!candidates.length) return queue

    const source = candidates.reduce((farthest, army) => {
      const farthestDist = typeof targetDistMap[farthest.idx] === 'number' ? targetDistMap[farthest.idx] : 0
      const armyDist = typeof targetDistMap[army.idx] === 'number' ? targetDistMap[army.idx] : 0
      return armyDist > farthestDist ? army : farthest
    }, candidates[0])

    const path = findPath({location: source, targetLocation: target, game})
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
