/**
 * AiBot — LLM-driven bot (OpenAI gpt-4o-mini; see src/ai/anthropicClient.js).
 *
 * Architecture: two-layer hybrid.
 *
 *   Layer 1 (tactical, every turn): BotFramework runs the existing strategy stack
 *     synchronously — DefendStrategy, MdkStrategy, CaptureStrategy, etc.
 *
 *   Layer 2 (strategic, every 50 turns): async LLM consultation that returns
 *     updated weights for attack/expand/defend, an overall posture, and an optional
 *     focus target (which opponent to hunt). These reorder the strategy stack, tune
 *     each strategy's config (e.g. minArmySize, cityArmyBuffer), and steer MdkStrategy's
 *     target selection.
 *
 * LLM calls are fire-and-forget — the bot keeps playing with current weights while
 * waiting for a response. Failures are silently swallowed; the bot degrades
 * gracefully to purely rules-based play.
 *
 * Memory: game results (win/loss + final weights) are saved to localStorage after
 * each game, both globally and per situational bucket (game phase x army parity —
 * see src/ai/aiContext.js) so learning can be conditional ("defend more when behind")
 * instead of one global compromise. A post-game LLM reflection also writes a short
 * textual lesson from the game's strategy timeline, fed back into future prompts.
 *
 * Requires: OPENAI_API_KEY (or REACT_APP_OPENAI_API_KEY) — see src/ai/anthropicClient.js
 */
import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { MdkStrategy } from '../strategies/MdkStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { ExtendedConsolidateStrategy } from '../strategies/ExtendedConsolidateStrategy'
import { askAI, askReflection } from '../ai/anthropicClient'
import { formatGameState } from '../ai/gameStateFormatter'
import { parseDirective, applyPosture, weightsToStrategyConfig, weightsToStrategyOrder } from '../ai/aiDirective'
import { computeContextBucket } from '../ai/aiContext'
import {
  loadMemory,
  saveMemory,
  recordGameResult,
  getLearnedWeights,
  getMemoryStats,
  addLesson,
} from '../ai/aiMemory'

/** Turns between LLM consultations */
const AI_CONSULT_INTERVAL = 50
/** Don't consult the LLM until the board has developed */
const MIN_TURNS_BEFORE_AI = 25

const aiBot = {
  /**
   * Initialize for a new game. Called by client.js on game_start.
   * @param {object} game
   */
  init(game) {
    this._game = game
    this._memory = loadMemory()

    const bucket = computeContextBucket(game)
    this._weights = getLearnedWeights(this._memory, bucket)
    this._bucketVisits = { [bucket]: { ...this._weights } }
    this._trace = []

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
    console.log(`[AiBot] situation "${bucket}" starting weights: A=${(this._weights.attack * 100).toFixed(0)}% E=${(this._weights.expand * 100).toFixed(0)}% D=${(this._weights.defend * 100).toFixed(0)}%`)
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
   * Records the result to memory (global + situational) so weights can improve
   * over time, then fires a one-shot post-game reflection for a textual lesson.
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
      bucketVisits: this._bucketVisits,
    })
    saveMemory(this._memory)

    const stats = getMemoryStats(this._memory)
    console.log(`[AiBot] game ${won ? 'WON 🏆' : 'LOST 💀'} after ${turns} turns`)
    console.log(`[AiBot] memory: ${stats.gamesPlayed} games, ${stats.winRate} win rate — best weights: ${stats.weights}`)

    this._reflect(won, turns, myScore)
  },

  // ─── Private methods ───────────────────────────────────────────────────────

  /**
   * Fire-and-forget LLM consultation.
   * Updates weights, posture, focus target, and strategy order when the response
   * arrives. Silently no-ops on API errors so the bot keeps playing regardless.
   */
  async _consultClaude() {
    this._pendingAICall = true
    this._lastAIConsult = this._game.turn
    // Credit the situation the *current* weights just played through, before
    // they potentially get replaced below.
    this._bucketVisits[computeContextBucket(this._game)] = { ...this._weights }
    try {
      const prompt = formatGameState(
        this._game,
        this._framework.intel,
        this._framework.foreignPolicy,
        this._weights,
        this._memory,
      )
      const response = await askAI(prompt)
      if (response) {
        const directive = parseDirective(response)
        if (directive) this._applyDirective(directive)
      }
    } catch (e) {
      console.warn('[AiBot] LLM consultation failed:', e.message)
    } finally {
      this._pendingAICall = false
    }
  },

  /**
   * Apply a parsed directive — update weights/posture, strategy configs, target
   * selection, and ordering. Also records the situational bucket visited and
   * appends to the in-game trace consumed by the post-game reflection.
   * @param {{ weights, directive, posture, focusTarget, reasoning }} directive
   */
  _applyDirective(directive) {
    this._weights = applyPosture(directive.weights, directive.posture)
    this._applyWeightsToConfigs(this._weights)
    this._strategies.mdk.config.preferredTargetIndex = directive.focusTarget

    // Rebuild strategy order and clear stale queue
    this._framework.strategies = this._buildStrategyOrder(this._weights)
    this._framework.attackQueue = []

    const bucket = computeContextBucket(this._game)
    this._bucketVisits[bucket] = { ...this._weights }
    this._trace.push({
      turn: this._game.turn,
      bucket,
      weights: { ...this._weights },
      directive: directive.directive,
      posture: directive.posture,
      focusTarget: directive.focusTarget,
      reasoning: directive.reasoning,
    })

    const pct = v => `${(v * 100).toFixed(0)}%`
    const postureSuffix = directive.posture ? ` (${directive.posture})` : ''
    console.log(`[AiBot] ${directive.directive}${postureSuffix}: ${directive.reasoning}`)
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

  /**
   * Fire-and-forget post-game reflection: ask the LLM for one actionable lesson
   * from this game's strategy timeline, then persist it to memory for future
   * prompts (see gameStateFormatter). Never affects live play — there's no game
   * state left to mutate by the time this resolves, and errors are swallowed.
   * @param {boolean} won
   * @param {number} turns
   * @param {{ total, tiles }} myScore
   */
  async _reflect(won, turns, myScore) {
    try {
      const timeline = this._trace
        .map(t => {
          const w = t.weights
          const postureSuffix = t.posture ? `/${t.posture}` : ''
          return `turn ${t.turn} [${t.bucket}] ${t.directive}${postureSuffix} → ` +
            `attack=${(w.attack * 100).toFixed(0)}% expand=${(w.expand * 100).toFixed(0)}% defend=${(w.defend * 100).toFixed(0)}% ` +
            `(${t.reasoning})`
        })
        .join('\n')

      const summary = [
        `Result: ${won ? 'WON' : 'LOST'} after ${turns} turns`,
        `Final score: ${myScore.total} armies / ${myScore.tiles} tiles`,
        timeline ? `Strategy timeline:\n${timeline}` : 'No strategic consults occurred this game.',
      ].join('\n')

      const lesson = await askReflection(summary)
      if (lesson) {
        this._memory = addLesson(this._memory, {
          result: won ? 'won' : 'lost',
          bucket: computeContextBucket(this._game),
          text: lesson,
        })
        saveMemory(this._memory)
        console.log(`[AiBot] lesson learned: ${lesson}`)
      }
    } catch (e) {
      console.warn('[AiBot] post-game reflection failed:', e.message)
    }
  },
}

export default aiBot
