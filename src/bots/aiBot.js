/**
 * AiBot — Anthropic AI-driven bot.
 *
 * Architecture: two-layer hybrid.
 *
 *   Layer 1 (tactical, every turn): BotFramework runs the existing strategy stack
 *     synchronously — DefendStrategy, MdkStrategy, CaptureStrategy, etc.
 *
 *   Layer 2 (strategic, every 50 turns): async Claude consultation that returns
 *     updated weights for attack/expand/defend. The weights then reorder the
 *     strategy stack and tune each strategy's config (e.g. minArmySize, cityArmyBuffer).
 *
 * Claude calls are fire-and-forget — the bot keeps playing with current weights
 * while waiting for a response. Failures are silently swallowed; the bot degrades
 * gracefully to purely rules-based play.
 *
 * Memory: game results (win/loss + final weights) are saved to localStorage after
 * each game. On init, past winning weights are blended in as the starting point,
 * letting the bot improve across sessions.
 *
 * Requires: ANTHROPIC_API_KEY in src/config.js
 */
import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { MdkStrategy } from '../strategies/MdkStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { ExtendedConsolidateStrategy } from '../strategies/ExtendedConsolidateStrategy'
import { askClaude } from '../ai/anthropicClient'
import { formatGameState } from '../ai/gameStateFormatter'
import { parseDirective, weightsToStrategyConfig, weightsToStrategyOrder } from '../ai/aiDirective'
import {
  loadMemory,
  saveMemory,
  recordGameResult,
  getLearnedWeights,
  getMemoryStats,
} from '../ai/aiMemory'

/** Turns between Claude consultations */
const AI_CONSULT_INTERVAL = 50
/** Don't consult Claude until the board has developed */
const MIN_TURNS_BEFORE_AI = 25

const aiBot = {
  /**
   * Initialize for a new game. Called by client.js on game_start.
   * @param {object} game
   */
  init(game) {
    this._game = game
    this._memory = loadMemory()
    this._weights = getLearnedWeights(this._memory)
    this._pendingAICall = false
    this._lastAIConsult = 0
    this._startTurn = 0

    // Named strategy instances — hold references so we can update their configs
    this._strategies = {
      defend: new DefendStrategy(),
      mdk: new MdkStrategy(),
      capture: new CaptureStrategy(),
      expand: new ExpandStrategy(),
      explore: new ExploreStrategy(),
      consolidate: new ExtendedConsolidateStrategy(),
    }

    this._applyWeightsToConfigs(this._weights)

    this._framework = new BotFramework(this._buildStrategyOrder(this._weights))
    this._framework.init(game)

    const stats = getMemoryStats(this._memory)
    console.log(`[AiBot] init — ${stats.gamesPlayed} games played, ${stats.winRate} win rate`)
    console.log(`[AiBot] starting weights: ${stats.weights}`)
  },

  /**
   * Execute one game turn. Called by client.js on game_update.
   */
  move() {
    this._framework.move()

    // Latch start turn on first real move
    if (!this._startTurn && this._game.turn > 0) {
      this._startTurn = this._game.turn
    }

    const turn = this._game.turn
    const shouldConsult =
      !this._pendingAICall &&
      turn >= MIN_TURNS_BEFORE_AI &&
      turn - this._lastAIConsult >= AI_CONSULT_INTERVAL

    if (shouldConsult) {
      this._consultClaude()
    }
  },

  /**
   * Called by client.js when the game ends (win or loss).
   * Records the result to memory so weights can improve over time.
   * @param {boolean} won
   */
  onGameEnd(won) {
    const myScore = this._game.myScore || { total: 0, tiles: 0 }
    const turns = this._game.turn - (this._startTurn || 0)

    this._memory = recordGameResult(this._memory, {
      won,
      finalWeights: { ...this._weights },
      turns,
      myScore,
    })
    saveMemory(this._memory)

    const stats = getMemoryStats(this._memory)
    console.log(`[AiBot] game ${won ? 'WON 🏆' : 'LOST 💀'} after ${turns} turns`)
    console.log(`[AiBot] memory: ${stats.gamesPlayed} games, ${stats.winRate} win rate — best weights: ${stats.weights}`)
  },

  // ─── Private methods ───────────────────────────────────────────────────────

  /**
   * Fire-and-forget Claude consultation.
   * Updates weights and strategy order when the response arrives.
   * Silently no-ops on API errors so the bot keeps playing regardless.
   */
  async _consultClaude() {
    this._pendingAICall = true
    this._lastAIConsult = this._game.turn
    try {
      const prompt = formatGameState(
        this._game,
        this._framework.intel,
        this._framework.foreignPolicy,
        this._weights,
        this._memory,
      )
      const response = await askClaude(prompt)
      if (response) {
        const directive = parseDirective(response)
        if (directive) this._applyDirective(directive)
      }
    } catch (e) {
      console.warn('[AiBot] Claude consultation failed:', e.message)
    } finally {
      this._pendingAICall = false
    }
  },

  /**
   * Apply a parsed directive — update weights, strategy configs, and ordering.
   * @param {{ weights, directive, reasoning }} directive
   */
  _applyDirective(directive) {
    this._weights = directive.weights
    this._applyWeightsToConfigs(this._weights)

    // Rebuild strategy order and clear stale queue
    this._framework.strategies = this._buildStrategyOrder(this._weights)
    this._framework.attackQueue = []

    const pct = v => `${(v * 100).toFixed(0)}%`
    console.log(`[AiBot] ${directive.directive}: ${directive.reasoning}`)
    console.log(`[AiBot] weights → attack=${pct(this._weights.attack)} expand=${pct(this._weights.expand)} defend=${pct(this._weights.defend)}`)
  },

  /**
   * Push weight-derived values into each strategy's config object.
   * @param {{ attack, expand, defend }} weights
   */
  _applyWeightsToConfigs(weights) {
    const cfg = weightsToStrategyConfig(weights)
    this._strategies.capture.config.cityArmyBuffer = cfg.capture.cityArmyBuffer
    this._strategies.expand.config.minArmySize = cfg.expand.minArmySize
    this._strategies.consolidate.config.minArmySize = cfg.consolidate.minArmySize
  },

  /**
   * Build an ordered strategy array from slot names derived by weightsToStrategyOrder.
   * @param {{ attack, expand, defend }} weights
   * @returns {BaseStrategy[]}
   */
  _buildStrategyOrder(weights) {
    return weightsToStrategyOrder(weights)
      .map(name => this._strategies[name])
      .filter(Boolean)
  },
}

export default aiBot
