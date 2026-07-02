import {
  loadMemory,
  saveMemory,
  recordGameResult,
  getLearnedWeights,
  getMemoryStats,
  getBucketStats,
  addLesson,
  getLessons,
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

describe('saveMemory error handling', () => {
  it('logs a warning and does not throw when localStorage.setItem fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => saveMemory(loadMemory())).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith('[AiBot] failed to save memory to localStorage', expect.any(Error))

    setItemSpy.mockRestore()
    warnSpy.mockRestore()
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

describe('recordGameResult with buckets', () => {
  it('increments losses for a visited bucket on a loss', () => {
    let mem = loadMemory()
    mem = recordGameResult(mem, { ...makeLoss(), bucketVisits: { 'mid|even': makeWeights(0.5, 0.3, 0.2) } })
    expect(mem.buckets['mid|even'].losses).toBe(1)
    expect(mem.buckets['mid|even'].wins).toBe(0)
  })

  it('increments wins and accumulates winWeightSums for a visited bucket on a win', () => {
    let mem = loadMemory()
    const w = makeWeights(0.6, 0.2, 0.2)
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|even': w } })
    expect(mem.buckets['mid|even'].wins).toBe(1)
    expect(mem.buckets['mid|even'].winWeightSums.attack).toBeCloseTo(0.6)
  })

  it('does not affect buckets that were not visited', () => {
    let mem = loadMemory()
    mem = recordGameResult(mem, { ...makeWin(), bucketVisits: { 'early|behind': makeWeights(0.7, 0.1, 0.2) } })
    expect(mem.buckets['mid|even']).toBeUndefined()
  })

  it('works fine when bucketVisits is omitted (backward compatible)', () => {
    const mem = loadMemory()
    expect(() => recordGameResult(mem, makeWin())).not.toThrow()
  })
})

describe('getLearnedWeights with a bucket key', () => {
  it('falls back to global weights when the bucket has fewer than 3 wins', () => {
    let mem = loadMemory()
    const w = makeWeights(0.7, 0.2, 0.1)
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|ahead': w } })
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|ahead': w } })
    expect(getLearnedWeights(mem, 'mid|ahead')).toEqual(mem.currentWeights)
  })

  it('returns the bucket average once it has 3+ wins', () => {
    let mem = loadMemory()
    const w = makeWeights(0.7, 0.2, 0.1)
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|ahead': w } })
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|ahead': w } })
    mem = recordGameResult(mem, { ...makeWin(w), bucketVisits: { 'mid|ahead': w } })
    expect(getLearnedWeights(mem, 'mid|ahead').attack).toBeCloseTo(0.7)
  })

  it('returns the global weights for a bucket that has never been visited', () => {
    const mem = loadMemory()
    expect(getLearnedWeights(mem, 'late|behind')).toEqual(mem.currentWeights)
  })
})

describe('getBucketStats', () => {
  it('returns N/A with zero games for an unseen bucket', () => {
    const stats = getBucketStats(loadMemory(), 'mid|even')
    expect(stats.games).toBe(0)
    expect(stats.winRate).toBe('N/A')
    expect(stats.weights).toBeNull()
  })

  it('computes a win rate across wins and losses in a bucket', () => {
    let mem = loadMemory()
    mem = recordGameResult(mem, { ...makeWin(), bucketVisits: { 'mid|even': DEFAULT_WEIGHTS } })
    mem = recordGameResult(mem, { ...makeLoss(), bucketVisits: { 'mid|even': DEFAULT_WEIGHTS } })
    const stats = getBucketStats(mem, 'mid|even')
    expect(stats.games).toBe(2)
    expect(stats.winRate).toBe('50.0%')
  })

  it('only includes weights once the bucket has 3+ wins', () => {
    let mem = loadMemory()
    mem = recordGameResult(mem, { ...makeWin(), bucketVisits: { 'mid|even': DEFAULT_WEIGHTS } })
    expect(getBucketStats(mem, 'mid|even').weights).toBeNull()
  })
})

describe('addLesson / getLessons', () => {
  it('adds a lesson retrievable via getLessons', () => {
    let mem = loadMemory()
    mem = addLesson(mem, { result: 'won', bucket: 'mid|even', text: 'attack harder next time' })
    expect(getLessons(mem)).toHaveLength(1)
    expect(getLessons(mem)[0].text).toBe('attack harder next time')
  })

  it('ignores lessons with no text', () => {
    const mem = loadMemory()
    const updated = addLesson(mem, { result: 'won' })
    expect(updated.lessons).toEqual(mem.lessons)
  })

  it('caps lessons at 10, keeping the most recent', () => {
    let mem = loadMemory()
    for (let i = 0; i < 15; i++) {
      mem = addLesson(mem, { result: 'won', text: `lesson ${i}` })
    }
    expect(mem.lessons).toHaveLength(10)
    expect(mem.lessons[mem.lessons.length - 1].text).toBe('lesson 14')
    expect(mem.lessons[0].text).toBe('lesson 5')
  })

  it('does not mutate the input memory', () => {
    const mem = loadMemory()
    addLesson(mem, { result: 'won', text: 'test' })
    expect(mem.lessons).toHaveLength(0)
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
