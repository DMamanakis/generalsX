import { BaseStrategy } from './BaseStrategy'
import { findPath, createDistanceMap } from '../utils/pathfinding'
import { makeAttackQueueObject, PRIORITY } from '../utils/attackQueue'
import { getTeammateInfo, getEmptyTilesAdjacentToTeammate } from '../intel/teamIntel'
import { findNeighbors } from '../utils/neighbors'

/**
 * CAPTURE FOR TEAMMATE strategy: find empty tiles that border the teammate's territory,
 * capture them, and then immediately push one step onto an adjacent teammate tile.
 *
 * Mechanics:
 *   1. Identify empty tiles that sit directly beside at least one teammate-owned tile.
 *   2. Path our best army to the nearest such tile.
 *   3. Append one final HANDOFF move from that captured tile onto the neighboring teammate
 *      tile — armies on a teammate tile transfer to the teammate's control.
 *
 * This builds a "buffer zone" and feeds territory to our partner simultaneously.
 * Steps 1–N (capturing) stay in the queue across turns; the final HANDOFF fires once
 * the empty tile is ours. If the tile is snatched by someone else mid-route, the
 * validator clears the queue and we re-plan next turn.
 *
 * Config options:
 *   minArmyToCapture {number} - Minimum army size to attempt this capture run (default: 4).
 */
export class CaptureForTeammateStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ minArmyToCapture: 4, ...config })
  }

  evaluate(game, intel, foreignPolicy) { // eslint-disable-line no-unused-vars
    if (!getTeammateInfo(game)) return false
    if (!intel.myTopArmies.length) return false
    if (intel.myTopArmies[0].armies < this.config.minArmyToCapture) return false
    return getEmptyTilesAdjacentToTeammate(game).length > 0
  }

  generateMoves(game, intel) {
    const queue = []
    if (!intel.myTopArmies.length) return queue

    const candidates = getEmptyTilesAdjacentToTeammate(game)
    if (!candidates.length) return queue

    const source = intel.myTopArmies[0]

    // Pick the empty tile reachable from our source with the shortest path
    const distMap = createDistanceMap({location: source, game})
    const reachable = candidates
      .filter(c => typeof distMap[c.idx] === 'number')
      .sort((a, b) => distMap[a.idx] - distMap[b.idx])

    if (!reachable.length) return queue
    const captureTarget = reachable[0]

    // Path from our army to the empty tile
    const path = findPath({location: source, targetLocation: captureTarget, game})
    if (path.length <= 1) return queue

    for (let i = path.length - 1; i > 0; i--) {
      const move = makeAttackQueueObject({
        mode: 'HANDOFF',
        attacker: path[i],
        target: path[i - 1],
        priority: PRIORITY.HANDOFF,
      })
      if (move) queue.push(move)
    }

    // After capturing, push onto the adjacent teammate tile to hand it off
    const neighborTeammateTile = findNeighbors({location: captureTarget, game})
      .find(n => n.isTeam)

    if (neighborTeammateTile) {
      const handoff = makeAttackQueueObject({
        mode: 'HANDOFF',
        attacker: captureTarget,
        target: neighborTeammateTile,
        priority: PRIORITY.HANDOFF,
      })
      if (handoff) queue.push(handoff)
    }

    return queue
  }
}
