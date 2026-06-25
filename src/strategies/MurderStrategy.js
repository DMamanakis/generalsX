import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'

/**
 * MURDER strategy: send the largest army on a path to an enemy general.
 * Only fires when foreign policy is not DEFEND (i.e. we are not outmatched).
 * Skips teammate generals.
 */
export class MurderStrategy extends BaseStrategy {
  evaluate(game, intel, foreignPolicy) {
    // Don't murder when we are outmatched — we'd be sacrificing our army
    if (foreignPolicy === FOREIGN_POLICY.DEFEND) return false

    return intel.myTopArmies.length > 0 &&
      game.generals.some((genIdx, playerIdx) =>
        genIdx > -1 &&
        game.opponents[playerIdx] &&
        !game.opponents[playerIdx].dead &&
        !(game.teams && game.teams[playerIdx] === game.team)
      )
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const source = intel.myTopArmies[0]

    for (let playerIdx = 0; playerIdx < game.generals.length; playerIdx++) {
      const genIdx = game.generals[playerIdx]
      if (genIdx <= -1 || !game.opponents[playerIdx] || game.opponents[playerIdx].dead) continue
      // Skip teammates
      if (game.teams && game.teams[playerIdx] === game.team) continue

      const path = findPath({location: source, targetLocation: genIdx, game})
      if (path.length <= 1) continue

      for (let i = path.length - 1; i > 0; i--) {
        const move = makeAttackQueueObject({
          mode: 'MURDER',
          attacker: path[i],
          target: path[i - 1],
          priority: PRIORITY.MURDER,
        })
        if (move) queue.push(move)
      }
      break
    }

    return queue
  }
}
