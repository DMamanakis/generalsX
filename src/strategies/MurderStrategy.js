import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'
import { getOpponentWithKnownGeneral } from '../intel/opponentAnalysis'

/**
 * MURDER strategy: send the largest army on a path to the weakest known enemy general.
 * Target selection uses opponentAnalysis to prefer the most vulnerable opponent
 * rather than always targeting by player index order.
 * Only fires when foreign policy is not DEFEND (i.e. we are not outmatched).
 * Teammate generals are excluded by opponentAnalysis.
 */
export class MurderStrategy extends BaseStrategy {
  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    if (!intel.myTopArmies.length) return false
    return getOpponentWithKnownGeneral(game) !== null
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const target = getOpponentWithKnownGeneral(game)
    if (!target) return queue

    const source = intel.myTopArmies[0]
    const path = findPath({location: source, targetLocation: target.generalLocationIndex, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'MURDER',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.MURDER,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
