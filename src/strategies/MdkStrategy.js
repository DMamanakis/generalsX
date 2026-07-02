import { BaseStrategy } from './BaseStrategy'
import { findPath } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'
import { getOpponentWithKnownGeneral, rankOpponents } from '../intel/opponentAnalysis'

/**
 * MDK strategy: send the largest army on a path to the weakest known enemy general.
 * Target selection uses opponentAnalysis to prefer the most vulnerable opponent
 * rather than always targeting by player index order — unless AiBot's strategic
 * consult has set config.preferredTargetIndex, in which case that opponent's
 * general is targeted instead (falling back to the default pick if it's dead,
 * unknown, or otherwise invalid).
 * Only fires when foreign policy is not DEFEND (i.e. we are not outmatched).
 * Teammate generals are excluded by opponentAnalysis.
 */
export class MdkStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ preferredTargetIndex: null, ...config })
  }

  /**
   * Resolve the opponent to target: the LLM-chosen preferredTargetIndex when it's a
   * live, non-team opponent with a known general, otherwise the weakest known general.
   * @param {object} game
   * @returns {object|null} opponent data from rankOpponents, or null
   */
  _resolveTarget(game) {
    const { preferredTargetIndex } = this.config
    if (preferredTargetIndex != null) {
      const preferred = rankOpponents(game)
        .find(opp => opp.playerIndex === preferredTargetIndex && opp.hasKnownGeneral)
      if (preferred) return preferred
    }
    return getOpponentWithKnownGeneral(game)
  }

  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    if (!intel.myTopArmies.length) return false
    return getOpponentWithKnownGeneral(game) !== null
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const target = this._resolveTarget(game)
    if (!target) return queue

    const source = intel.myTopArmies[0]
    const path = findPath({location: source, targetLocation: target.generalLocationIndex, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'MDK',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.MDK,
      })
      if (move) queue.push(move)
    }

    return queue
  }
}
