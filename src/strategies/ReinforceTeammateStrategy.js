import { BaseStrategy } from './BaseStrategy'
import { findPath, createDistanceMap } from '../utils/pathfinding'
import { getLocationObject } from '../core/locationObject'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { getTeammateInfo } from '../intel/teamIntel'
import { findNeighbors } from '../utils/neighbors'

/**
 * REINFORCE TEAMMATE strategy: march our largest army toward the teammate's general.
 * When our armies step onto a teammate tile the server transfers ownership to them —
 * that is the hand-off mechanic. The path naturally crosses from our territory into
 * theirs, and the queue is invalidated once we've handed off (the attacker tile is no
 * longer ours), so the bot re-plans next turn and sends the next army.
 *
 * Only fires in team games. Falls back to finding the nearest teammate tile when the
 * general's location is not yet visible.
 *
 * Config options:
 *   minArmyToShare {number} - Minimum army size before we start marching toward the
 *     teammate (default: 8). Prevents the bot from sending tiny stacks that barely help.
 */
export class ReinforceTeammateStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ minArmyToShare: 8, ...config })
  }

  evaluate(game, intel, foreignPolicy) { // eslint-disable-line no-unused-vars
    const teammate = getTeammateInfo(game)
    if (!teammate) return false
    if (!intel.myTopArmies.length) return false
    if (intel.myTopArmies[0].armies < this.config.minArmyToShare) return false

    // Need somewhere to march toward — a known general or at least one visible tile
    return teammate.generalLocationIndex !== null || this._findNearestTeammateTile(game) !== null
  }

  generateMoves(game, intel) {
    const queue = []
    const teammate = getTeammateInfo(game)
    if (!teammate) return queue
    if (!intel.myTopArmies.length) return queue

    const source = intel.myTopArmies[0]

    // Prefer the teammate's known general; fall back to the nearest of their tiles
    let targetIdx = teammate.generalLocationIndex
    if (targetIdx === null) {
      const nearest = this._findNearestTeammateTile(game, source)
      if (!nearest) return queue
      targetIdx = nearest.idx
    }

    const targetLocation = getLocationObject({locationIdx: targetIdx, game})
    const path = findPath({location: source, targetLocation, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'REINFORCE',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.REINFORCE,
      })
      if (move) queue.push(move)
    }

    return queue
  }

  /**
   * Find the teammate tile closest to the given source (or any teammate tile if no source).
   * @param {object} game
   * @param {object} [source] - Our army location object (used to rank by BFS distance)
   * @returns {object|null} Nearest teammate tile location object, or null
   */
  _findNearestTeammateTile(game, source) {
    const teammateTiles = game.locations ? game.locations.filter(loc => loc.isTeam) : []
    if (!teammateTiles.length) return null
    if (!source) return teammateTiles[0]

    const distMap = createDistanceMap({location: source, game})
    let nearest = null
    let nearestDist = Infinity

    for (const tile of teammateTiles) {
      const d = distMap[tile.idx]
      if (typeof d === 'number' && d < nearestDist) {
        nearest = tile
        nearestDist = d
      }
    }

    return nearest
  }
}
