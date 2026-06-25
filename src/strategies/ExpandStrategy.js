import { BaseStrategy } from './BaseStrategy'
import { findNeighbors } from '../utils/neighbors'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { canCapture } from '../utils/combat'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'

/**
 * CREEP strategy: find immediate captures by checking every army's neighbors.
 * Skips during DEFEND — spreading thin while threatened is dangerous.
 *
 * Config options:
 *   minArmySize {number} - Minimum army size required to attempt expansion (default: 2).
 *     Increase for conservative bots that should only push with substantial forces.
 */
export class ExpandStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ minArmySize: 2, ...config })
  }

  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    return intel.myTopArmies
      .filter(army => army.armies >= this.config.minArmySize)
      .some(army => {
        const neighbors = findNeighbors({location: army, game})
        return neighbors.some(n => n.attackable && canCapture(army, n, game))
      })
  }

  generateMoves(game, intel) {
    const queue = []
    const targets = [...intel.visibleOpponentTerritories, ...intel.emptyTerritories]
    const availableArmies = intel.myTopArmies
      .filter(army => army.armies >= this.config.minArmySize)

    this._generateSimpleAttacks(targets, [...availableArmies], queue, game)
    return queue
  }

  _generateSimpleAttacks(targets, armies, queue, game) {
    while (targets.length > 0 && armies.length > 0) {
      const target = targets.shift()
      let attackerIdx = -1
      let usedArmyIdx = -1

      for (let i = 0; i < armies.length; i++) {
        const neighbors = findNeighbors({location: armies[i], game})
        for (const neighbor of neighbors) {
          if (neighbor.idx === target.idx && canCapture(armies[i], target, game)) {
            attackerIdx = armies[i].idx
            usedArmyIdx = i
            break
          }
        }
        if (attackerIdx !== -1) break
      }

      if (attackerIdx !== -1) {
        armies.splice(usedArmyIdx, 1)
        const move = makeAttackQueueObject({
          mode: 'CREEP',
          attacker: attackerIdx,
          target: target.idx,
          priority: PRIORITY.CREEP,
        })
        if (move) queue.push(move)
      }
    }
  }
}
