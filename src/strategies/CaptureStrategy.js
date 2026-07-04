import { BaseStrategy } from './BaseStrategy'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'
import { findBestCityCapture } from '../intel/cityIntel'

/**
 * CAPTURE strategy: path to the cheapest affordable known city, using whichever of our
 * top armies can best reach it — not just the single largest stack.
 * Cities compound army growth, so capturing them is worthwhile during EXPAND and MDK.
 * Skips during EXPLORE (too early) and DEFEND (wrong time to roam).
 *
 * Targets survive fog: a city scouted once stays a candidate via game.knownCities even
 * after it's no longer visible (see src/intel/cityIntel.js).
 *
 * Config options:
 *   cityArmyBuffer {number} - Our army must exceed the city's garrison by at least this
 *     much to attempt capture (default: 1). Increase for cautious bots that should only
 *     take easily affordable cities.
 */
export class CaptureStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ cityArmyBuffer: 1, ...config })
  }

  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.EXPLORE || foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    return findBestCityCapture(game, intel, this.config.cityArmyBuffer) !== null
  }

  generateMoves(game, intel) {
    const queue = []
    const best = findBestCityCapture(game, intel, this.config.cityArmyBuffer)
    if (!best) return queue

    const { path } = best
    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'CAPTURE',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.CAPTURE,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
