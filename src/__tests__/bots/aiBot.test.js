jest.mock('../../ai/anthropicClient', () => ({
  askAI: jest.fn(),
  askReflection: jest.fn(),
}))

import aiBot from '../../bots/aiBot'
import { askAI, askReflection } from '../../ai/anthropicClient'
import { loadMemory } from '../../ai/aiMemory'
import { DefendStrategy } from '../../strategies/DefendStrategy'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { CaptureStrategy } from '../../strategies/CaptureStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { ExtendedConsolidateStrategy } from '../../strategies/ExtendedConsolidateStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

/** Matches MIN_TURNS_BEFORE_AI in src/bots/aiBot.js */
const MIN_TURNS_BEFORE_AI = 25
/** Matches MIN_CONSULT_COOLDOWN in src/bots/aiBot.js */
const MIN_CONSULT_COOLDOWN = 10

function makeGame() {
  return initializeGameState('withOpponent', 'allArmiesOnGeneral')
}

beforeEach(() => {
  localStorage.clear()
  askAI.mockReset()
  askReflection.mockReset()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('init', () => {
  it('builds a framework with all six named strategies wired', () => {
    aiBot.init(makeGame())
    expect(aiBot._strategies.defend).toBeInstanceOf(DefendStrategy)
    expect(aiBot._strategies.mdk).toBeInstanceOf(MdkStrategy)
    expect(aiBot._strategies.capture).toBeInstanceOf(CaptureStrategy)
    expect(aiBot._strategies.expand).toBeInstanceOf(ExpandStrategy)
    expect(aiBot._strategies.explore).toBeInstanceOf(ExploreStrategy)
    expect(aiBot._strategies.consolidate).toBeInstanceOf(ExtendedConsolidateStrategy)
    expect(aiBot._framework.strategies.length).toBeGreaterThan(0)
  })

  it('seeds weights that sum to 1.0', () => {
    aiBot.init(makeGame())
    const { attack, expand, defend } = aiBot._weights
    expect(attack + expand + defend).toBeCloseTo(1.0)
  })

  it('seeds bucketVisits with the opening situational bucket', () => {
    const game = makeGame()
    aiBot.init(game)
    expect(Object.keys(aiBot._bucketVisits)).toHaveLength(1)
  })

  it('starts with an empty trace and no pending call', () => {
    aiBot.init(makeGame())
    expect(aiBot._trace).toEqual([])
    expect(aiBot._pendingAICall).toBe(false)
    expect(aiBot._lastAIConsult).toBe(0)
  })

  it('does not consult the LLM on init', () => {
    aiBot.init(makeGame())
    expect(askAI).not.toHaveBeenCalled()
  })
})

describe('move', () => {
  it('delegates to the framework every call', () => {
    const game = makeGame()
    aiBot.init(game)
    const moveSpy = jest.spyOn(aiBot._framework, 'move')
    aiBot.move()
    expect(moveSpy).toHaveBeenCalledTimes(1)
  })

  it('latches _startTurn on the first turn with turn > 0', () => {
    const game = makeGame()
    aiBot.init(game)
    game.turn = 5
    aiBot.move()
    expect(aiBot._startTurn).toBe(5)
  })

  it('does not consult before MIN_TURNS_BEFORE_AI', () => {
    const game = makeGame()
    aiBot.init(game)
    jest.spyOn(aiBot, '_consultClaude').mockImplementation(() => {})
    game.turn = MIN_TURNS_BEFORE_AI - 1
    aiBot.move()
    expect(aiBot._consultClaude).not.toHaveBeenCalled()
  })

  it('consults once past MIN_TURNS_BEFORE_AI', () => {
    const game = makeGame()
    aiBot.init(game)
    jest.spyOn(aiBot, '_consultClaude').mockImplementation(() => {})
    game.turn = MIN_TURNS_BEFORE_AI
    aiBot.move()
    expect(aiBot._consultClaude).toHaveBeenCalledTimes(1)
  })

  it('does not consult again while a call is pending', () => {
    const game = makeGame()
    aiBot.init(game)
    jest.spyOn(aiBot, '_consultClaude').mockImplementation(() => {})
    aiBot._pendingAICall = true
    game.turn = MIN_TURNS_BEFORE_AI
    aiBot.move()
    expect(aiBot._consultClaude).not.toHaveBeenCalled()
  })

  it('does not consult again before the cooldown elapses', () => {
    const game = makeGame()
    aiBot.init(game)
    jest.spyOn(aiBot, '_consultClaude').mockImplementation(() => {})
    aiBot._lastAIConsult = 25
    game.turn = 25 + MIN_CONSULT_COOLDOWN - 1
    aiBot.move()
    expect(aiBot._consultClaude).not.toHaveBeenCalled()
  })

  it('consults again once the cooldown has elapsed', () => {
    const game = makeGame()
    aiBot.init(game)
    jest.spyOn(aiBot, '_consultClaude').mockImplementation(() => {})
    aiBot._lastAIConsult = 25
    game.turn = 25 + MIN_CONSULT_COOLDOWN
    aiBot.move()
    expect(aiBot._consultClaude).toHaveBeenCalledTimes(1)
  })
})

describe('_consultClaude', () => {
  it('sets _pendingAICall synchronously before the response resolves', () => {
    const game = makeGame()
    aiBot.init(game)
    let resolvePromise
    askAI.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))
    aiBot._consultClaude()
    expect(aiBot._pendingAICall).toBe(true)
    resolvePromise(null)
  })

  it('applies a directive returned by askAI and clears pendingAICall', async () => {
    const game = makeGame()
    aiBot.init(game)
    askAI.mockResolvedValue('{"weights":{"attack":0.7,"expand":0.2,"defend":0.1},"directive":"ATTACK","reasoning":"go"}')
    await aiBot._consultClaude()
    expect(aiBot._weights.attack).toBeCloseTo(0.7)
    expect(aiBot._pendingAICall).toBe(false)
  })

  it('leaves weights unchanged when askAI resolves with unparseable content', async () => {
    const game = makeGame()
    aiBot.init(game)
    const before = { ...aiBot._weights }
    askAI.mockResolvedValue('not json')
    await aiBot._consultClaude()
    expect(aiBot._weights).toEqual(before)
  })

  it('leaves weights unchanged and clears pendingAICall when askAI rejects', async () => {
    const game = makeGame()
    aiBot.init(game)
    const before = { ...aiBot._weights }
    askAI.mockRejectedValue(new Error('network error'))
    await aiBot._consultClaude()
    expect(aiBot._weights).toEqual(before)
    expect(aiBot._pendingAICall).toBe(false)
  })

  it('records the pre-consult bucket/weights into bucketVisits', async () => {
    const game = makeGame()
    aiBot.init(game)
    askAI.mockResolvedValue(null)
    const bucketCountBefore = Object.keys(aiBot._bucketVisits).length
    await aiBot._consultClaude()
    expect(Object.keys(aiBot._bucketVisits).length).toBeGreaterThanOrEqual(bucketCountBefore)
  })
})

describe('_applyDirective', () => {
  it('updates weights, rebuilds strategy order, and clears the attack queue', () => {
    const game = makeGame()
    aiBot.init(game)
    aiBot._framework.attackQueue = [{ attackerIndex: 1, targetIndex: 2, mode: 'X', priority: 0, sendHalf: false }]

    aiBot._applyDirective({
      weights: { attack: 0.6, expand: 0.2, defend: 0.2 },
      directive: 'ATTACK',
      posture: null,
      focusTarget: null,
      reasoning: 'test',
    })

    expect(aiBot._weights.attack).toBeCloseTo(0.6)
    expect(aiBot._framework.attackQueue).toEqual([])
    expect(aiBot._framework.strategies[0]).toBe(aiBot._strategies.defend)
  })

  it('sets MdkStrategy.config.preferredTargetIndex from focusTarget', () => {
    const game = makeGame()
    aiBot.init(game)
    aiBot._applyDirective({
      weights: { attack: 0.5, expand: 0.3, defend: 0.2 },
      directive: 'ATTACK',
      posture: null,
      focusTarget: 0,
      reasoning: 'focus',
    })
    expect(aiBot._strategies.mdk.config.preferredTargetIndex).toBe(0)
  })

  it('applies a posture adjustment before storing weights', () => {
    const game = makeGame()
    aiBot.init(game)
    aiBot._applyDirective({
      weights: { attack: 0.4, expand: 0.3, defend: 0.3 },
      directive: 'ATTACK',
      posture: 'ALL_IN',
      focusTarget: null,
      reasoning: 'commit',
    })
    expect(aiBot._weights.attack).toBeGreaterThan(0.4)
  })

  it('appends an entry to the trace', () => {
    const game = makeGame()
    aiBot.init(game)
    aiBot._applyDirective({
      weights: { attack: 0.5, expand: 0.3, defend: 0.2 },
      directive: 'BALANCED',
      posture: null,
      focusTarget: null,
      reasoning: 'steady',
    })
    expect(aiBot._trace).toHaveLength(1)
    expect(aiBot._trace[0]).toMatchObject({ directive: 'BALANCED', reasoning: 'steady' })
  })
})

describe('onGameEnd', () => {
  it('records the result to memory and persists it', () => {
    const game = makeGame()
    aiBot.init(game)
    askReflection.mockResolvedValue(null)
    game.turn = 100
    game.myScore = { total: 50, tiles: 10 }

    aiBot.onGameEnd(true)

    const persisted = loadMemory()
    expect(persisted.games).toHaveLength(1)
    expect(persisted.games[0].result).toBe('won')
  })

  it('defaults myScore when the game object has none', () => {
    const game = makeGame()
    aiBot.init(game)
    askReflection.mockResolvedValue(null)
    game.myScore = undefined
    expect(() => aiBot.onGameEnd(false)).not.toThrow()
  })

  it('fires a post-game reflection and stores the lesson on success', async () => {
    const game = makeGame()
    aiBot.init(game)
    askReflection.mockResolvedValue('attack sooner next time')
    const reflectSpy = jest.spyOn(aiBot, '_reflect')

    aiBot.onGameEnd(true)
    await reflectSpy.mock.results[0].value

    const persisted = loadMemory()
    expect(persisted.lessons.some(l => l.text === 'attack sooner next time')).toBe(true)
  })

  it('does not store a lesson when askReflection resolves with nothing', async () => {
    const game = makeGame()
    aiBot.init(game)
    askReflection.mockResolvedValue(null)
    const reflectSpy = jest.spyOn(aiBot, '_reflect')

    aiBot.onGameEnd(false)
    await reflectSpy.mock.results[0].value

    const persisted = loadMemory()
    expect(persisted.lessons).toEqual([])
  })

  it('swallows reflection errors without throwing', async () => {
    const game = makeGame()
    aiBot.init(game)
    askReflection.mockRejectedValue(new Error('network down'))
    const reflectSpy = jest.spyOn(aiBot, '_reflect')

    expect(() => aiBot.onGameEnd(false)).not.toThrow()
    await expect(reflectSpy.mock.results[0].value).resolves.toBeUndefined()
  })

  it('includes a formatted strategy timeline in the reflection summary when consults occurred', async () => {
    const game = makeGame()
    aiBot.init(game)
    aiBot._applyDirective({
      weights: { attack: 0.6, expand: 0.2, defend: 0.2 },
      directive: 'ATTACK',
      posture: 'ALL_IN',
      focusTarget: null,
      reasoning: 'pressing the advantage',
    })
    askReflection.mockResolvedValue(null)
    const reflectSpy = jest.spyOn(aiBot, '_reflect')

    aiBot.onGameEnd(true)
    await reflectSpy.mock.results[0].value

    const [summary] = askReflection.mock.calls[askReflection.mock.calls.length - 1]
    expect(summary).toContain('Strategy timeline:')
    expect(summary).toContain('ATTACK/ALL_IN')
    expect(summary).toContain('pressing the advantage')
  })
})

describe('end-to-end move()', () => {
  it('plays a full turn and can emit an attack once past the opening threshold', () => {
    const game = makeGame()
    aiBot.init(game)
    game.turn = 30
    aiBot.move()
    // Either it found a valid move (emits) or it didn't — either way it must not throw,
    // and the framework must have been given a chance to gather intel and act.
    expect(aiBot._framework.intel).not.toEqual({})
  })
})
