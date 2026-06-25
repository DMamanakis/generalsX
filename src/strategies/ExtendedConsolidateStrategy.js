import { BaseStrategy } from './BaseStrategy'
import { findPath, createDistanceMap } from '../utils/pathfinding'
import { getLocationObject } from '../core/locationObject'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'

/**
 * EXTENDED CONSOLIDATE strategy: pulls ALL scattered armies toward the general,
 * including small stacks that ConsolidateStrategy ignores.
 *
 * Selects the army with the highest (armies × distance) score — prioritizing
 * the most valuable force that is most stuck far from home, rather than simply
 * the farthest army.
 *
 * Uses intel.myArmies (all owned tiles) rather than intel.myTopArmies.
 * Only fires during DEFEND — consolidating territory during any other phase
 * wastes offensive momentum.
 *
 * Config options:
 *   minArmySize {number} - Minimum army size to consider for consolidation (default: 1).
 *     Set higher to ignore 1-unit stacks if you only want meaningful forces recalled.
 *   minDistanceToConsolidate {number} - Minimum tile distance from general before an
 *     army is considered for recall (default: 2). Prevents pointlessly moving armies
 *     that are already adjacent or nearby.
 */
export class ExtendedConsolidateStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ minArmySize: 1, minDistanceToConsolidate: 2, ...config })
  }

  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy !== FOREIGN_POLICY.DEFEND) return false
    if (!game.myGeneralLocationIndex || !intel.myArmies.length) return false

    const general = getLocationObject({locationIdx: game.myGeneralLocationIndex, game})
    const generalDistMap = createDistanceMap({location: general, game})

    return intel.myArmies.some(a => {
      if (a.idx === game.myGeneralLocationIndex) return false
      if (a.armies < this.config.minArmySize) return false
      const dist = generalDistMap[a.idx]
      return typeof dist === 'number' && dist >= this.config.minDistanceToConsolidate
    })
  }

  generateMoves(game, intel) {
    const queue = []
    if (!game.myGeneralLocationIndex || !intel.myArmies.length) return queue

    const general = getLocationObject({locationIdx: game.myGeneralLocationIndex, game})
    const generalDistMap = createDistanceMap({location: general, game})

    // Filter to armies that meet size and distance thresholds
    const candidates = intel.myArmies.filter(a => {
      if (a.idx === game.myGeneralLocationIndex) return false
      if (a.armies < this.config.minArmySize) return false
      const dist = generalDistMap[a.idx]
      return typeof dist === 'number' && dist >= this.config.minDistanceToConsolidate
    })

    if (!candidates.length) return queue

    // Pick the army with the highest armies × distance score —
    // the most valuable force stuck farthest from home
    const source = candidates.reduce((best, army) => {
      const bestScore = (generalDistMap[best.idx] || 0) * best.armies
      const armyScore = (generalDistMap[army.idx] || 0) * army.armies
      return armyScore > bestScore ? army : best
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
