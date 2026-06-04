import { gatherIntel } from '../intel/intelGathering'
import { determineForeignPolicy, FOREIGN_POLICY } from '../intel/foreignPolicy'
import { isValidQueueObject } from '../utils/attackQueue'

const OPENING_FIRST_MOVE_THRESHOLD = 24

/**
 * BotFramework orchestrates strategy selection, attack queue management,
 * and move emission for a given set of strategy modules.
 *
 * Bot presets create a BotFramework with their chosen strategy list and
 * expose `init(game)` and `move()` to the client.
 */
export class BotFramework {
  /**
   * @param {Array} strategies - Ordered array of strategy instances (highest-priority first)
   */
  constructor(strategies) {
    this.strategies = strategies
    this.attackQueue = []
    this.log = Array(5)
    this.intel = {}
    this.foreignPolicy = FOREIGN_POLICY.EXPLORE
    this.game = null
  }

  /**
   * Initialize or re-initialize the framework for a new game.
   * @param {object} game - The game state object from client
   */
  init(game) {
    this.game = game
    this.attackQueue = []
    this.log = Array(5)
    this.intel = {}
    this.foreignPolicy = FOREIGN_POLICY.EXPLORE
  }

  /**
   * Execute one game turn: gather intel, validate queue, fill if empty, emit a move.
   */
  move() {
    if (this.game.turn <= OPENING_FIRST_MOVE_THRESHOLD) {
      return // Let armies accumulate before first move
    }

    // Preserve unexploredTerritories across turns
    this.intel = gatherIntel(this.game, this.intel)
    this.foreignPolicy = determineForeignPolicy(this.game, this.intel)

    this._validateQueue()

    if (this.attackQueue.length === 0) {
      this._fillQueue()
    }

    if (this.attackQueue.length > 0) {
      const move = this.attackQueue.shift()
      this.log.unshift({mode: move.mode, attackerIndex: move.attackerIndex, targetIndex: move.targetIndex})
      this.log.length = 5
      this.game.socket.emit('attack', move.attackerIndex, move.targetIndex, move.sendHalf)
    }
  }

  /**
   * Invalidate the queue if the next move is no longer viable.
   */
  _validateQueue() {
    if (this.attackQueue.length === 0) return

    const next = this.attackQueue[0]
    if (!this.game.locations) return

    const attacker = this.game.locations[next.attackerIndex]
    const target = this.game.locations[next.targetIndex]

    if (!attacker || !target || !attacker.isMine || attacker.armies < 2) {
      this.attackQueue = []
      return
    }

    const wouldLose = (attacker.armies - 1 <= target.armies) && !target.isMine
    if (wouldLose && next.priority < 50) {
      this.attackQueue = []
    }
  }

  /**
   * Ask each strategy in priority order to generate moves, stopping at the first that has any.
   */
  _fillQueue() {
    for (const strategy of this.strategies) {
      if (strategy.evaluate(this.game, this.intel)) {
        const moves = strategy.generateMoves(this.game, this.intel)
        const valid = moves.filter(isValidQueueObject)
        if (valid.length > 0) {
          this.attackQueue.push(...valid)
          return
        }
      }
    }
  }
}
