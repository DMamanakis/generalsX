import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'

/**
 * CAPTURE strategy: path to the weakest affordable visible city.
 * Cities compound army growth, so capturing them is worthwhile during EXPAND and MURDER.
 * Skips during EXPLORE (too early, waste armies) and DEFEND (wrong time to roam).
 */
export class CaptureStrategy extends BaseStrategy {
  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.EXPLORE || foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    if (!intel.myTopArmies.length || !game.cities.length) return false
    const source = intel.myTopArmies[0]
    return game.cities.some(cityIdx => source.armies > game.armies[cityIdx] + 1)
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const source = intel.myTopArmies[0]

    // Sort cities by army count (cheapest first)
    const affordableCities = game.cities
      .filter(cityIdx => source.armies > game.armies[cityIdx] + 1)
      .sort((a, b) => game.armies[a] - game.armies[b])

    for (const cityIdx of affordableCities) {
      const path = findPath({location: source, targetLocation: cityIdx, game})
      if (path.length <= 1) continue

      for (let i = path.length - 1; i > 0; i--) {
        const move = makeAttackQueueObject({
          mode: 'CAPTURE',
          attacker: path[i],
          target: path[i - 1],
          priority: PRIORITY.CAPTURE,
        })
        if (move) queue.push(move)
      }
      break
    }

    return queue
  }
}
