import {
  loadMemory,
  saveMemory,
  recordGameResult,
  getLearnedWeights,
  getMemoryStats,
  DEFAULT_WEIGHTS,
} from '../../ai/aiMemory'

const MEMORY_KEY = 'generalsX_aiBot_memory'

const makeWeights = (a, e, d) => ({ attack: a, expand: e, defend: d })
const makeScore = (total = 100, tiles = 20) => ({ total, tiles })

function makeWin(weights = DEFAULT_WEIGHTS) {
  return { won: true, finalWeights: weights, turns: 200, myScore: makeScore() }
}
function makeLoss(weights = DEFAULT_WEIGHTS) {
  return { won: false, finalWeights: weights, turns: 150, myScore: makeScore() }
}

beforeEach(() => {
  localStorage.clear()
})

describe('loadMemory', () => {
  it('returns default when localStorage is empty', () => {
    const mem = loadMemory()
    expect(mem.games).toEqual([])
    expect(mem.currentWeights).toMatchObject({ attack: expect.any(Number) })
  })

  it('returns default on malformed JSON', () => {
    localStorage.setItem(MEMORY_KEY, 'not-json')
    const mem = loadMemory()
    expect(mem.games).toEqual([])
  })

  it('returns default on missing fields', () => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ version: 1 }))
    const mem = loadMemory()
    expect(mem.games).toEqual([])
  })

  it('loads previously saved memory', () => {
    const seed = { version: 1, currentWeights: makeWeights(0.5, 0.3, 0.2), games: [] }
    localStorage.setItem(MEMORY_KEY, JSON.stringify(seed))
    const mem = loadMemory()
    expect(mem.currentWeights.attack).toBeCloseTo(0.5)
  })
})

describe('saveMemory / loadMemory roundtrip', () => {
  it('persists and restores memory', () => {
    const mem = loadMemory()
    const updated = recordGameResult(mem, makeWin())
    saveMemory(updated)
    const restored = loadMemory()
    expect(restored.games).toHaveLength(1)
    expect(restored.games[0].result).toBe('won')
  })
})

describe('recordGameResult', () => {
  it('adds a game entry', () => {
    const mem = loadMemory()
    const updated = recordGameResult(mem, makeWin())
    expect(updated.games).toHaveLength(1)
    expect(updated.games[0].result).toBe('won')
    expect(updated.games[0].turns).toBe(200)
  })

  it('records a loss', () => {
    const mem = loadMemory()
    const updated = recordGameResult(mem, makeLoss())
    expect(updated.games[0].result).toBe('lost')
  })

  it('does not mutate the input memory', () => {
    const mem = loadMemory()
    recordGameResult(mem, makeWin())
    expect(mem.games).toHaveLength(0)
  })

  it('caps games at 50 entries', () => {
    let mem = loadMemory()
    for (let i = 0; i < 55; i++) {
      mem = recordGameResult(mem, makeWin())
    }
    expect(mem.games).toHaveLength(50)
  })

  it('does not update weights with fewer than 3 wins', () => {
    let mem = loadMemory()
    const initialWeights = { ...mem.currentWeights }
    mem = recordGameResult(mem, makeWin(makeWeights(0.8, 0.1, 0.1)))
    mem = recordGameResult(mem, makeWin(makeWeights(0.8, 0.1, 0.1)))
    // Only 2 wins — no blend yet
    expect(mem.currentWeights.attack).toBeCloseTo(initialWeights.attack)
  })

  it('blends toward winning weights after 3+ wins', () => {
    let mem = loadMemory()
    const aggressiveWeights = makeWeights(0.8, 0.1, 0.1)
    mem = recordGameResult(mem, makeWin(aggressiveWeights))
    mem = recordGameResult(mem, makeWin(aggressiveWeights))
    mem = recordGameResult(mem, makeWin(aggressiveWeights))
    // After 3 wins with attack=0.8, attack weight should have increased
    expect(mem.currentWeights.attack).toBeGreaterThan(DEFAULT_WEIGHTS.attack)
  })
})

describe('getLearnedWeights', () => {
  it('returns a copy of currentWeights', () => {
    const mem = loadMemory()
    const weights = getLearnedWeights(mem)
    expect(weights).toEqual(mem.currentWeights)
    // Verify it is a copy, not the same reference
    weights.attack = 999
    expect(mem.currentWeights.attack).not.toBe(999)
  })
})

describe('getMemoryStats', () => {
  it('returns N/A win rate with no games', () => {
    const mem = loadMemory()
    const stats = getMemoryStats(mem)
    expect(stats.winRate).toBe('N/A')
    expect(stats.gamesPlayed).toBe(0)
  })

  it('calculates correct win rate', () => {
    let mem = loadMemory()
    mem = recordGameResult(mem, makeWin())
    mem = recordGameResult(mem, makeLoss())
    const stats = getMemoryStats(mem)
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.wins).toBe(1)
    expect(stats.losses).toBe(1)
    expect(stats.winRate).toBe('50.0%')
  })

  it('formats weights string', () => {
    const mem = loadMemory()
    const stats = getMemoryStats(mem)
    expect(stats.weights).toMatch(/A=\d+% E=\d+% D=\d+%/)
  })
})
