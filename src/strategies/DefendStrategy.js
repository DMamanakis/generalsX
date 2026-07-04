import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { getLocationObject } from '../core/locationObject'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'
import { getDefenseTarget } from '../intel/cityIntel'

/**
 * DEFEND strategy: when threats are detected near our general — or, absent a general
 * threat, near a city we own — move the nearest large army toward the threatened
 * position as a defensive response. A general-level threat always takes priority over
 * a city one (see cityIntel.getDefenseTarget).
 * Only fires when foreign policy is DEFEND — no need to pull back armies when we are dominant.
 * Threats are sourced from intel (computed once per turn in gatherIntel).
 */
export class DefendStrategy extends BaseStrategy {
  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy !== FOREIGN_POLICY.DEFEND) return false
    return intel.threats.length > 0 && intel.myTopArmies.length > 0
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.threats.length || !intel.myTopArmies.length || !game.myGeneralLocationIndex) return queue

    const target = getLocationObject({locationIdx: getDefenseTarget(game, intel), game})

    // Find the largest army that is not the general itself
    const defender = intel.myTopArmies.find(a => a.idx !== game.myGeneralLocationIndex)
    if (!defender) return queue

    const path = findPath({location: defender, targetLocation: target, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'DEFEND',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.DEFEND,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
