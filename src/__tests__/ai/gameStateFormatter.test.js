import { formatGameState } from '../../ai/gameStateFormatter'
import { loadMemory, addLesson } from '../../ai/aiMemory'

beforeEach(() => {
  localStorage.clear()
})

function makeGame(overrides = {}) {
  return {
    turn: 100,
    mapWidth: 5,
    myGeneralLocationIndex: 6,
    myScore: { total: 300, tiles: 45 },
    opponents: [
      -1, // dead
      { dead: false, generalLocationIndex: 12, total: 200, tiles: 30 },
      { dead: false, generalLocationIndex: -1, total: 50, tiles: 10 },
    ],
    ...overrides,
  }
}

function makeIntel(overrides = {}) {
  return {
    threats: [],
    myTopArmies: [{ armies: 42, idx: 5 }],
    ...overrides,
  }
}

describe('formatGameState', () => {
  it('returns a non-empty string', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes turn number', () => {
    const result = formatGameState(
      makeGame({ turn: 250 }), makeIntel(), 'MDK',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toContain('250')
  })

  it('includes score', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toContain('300')
    expect(result).toContain('45')
  })

  it('includes current weights as percentages', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toContain('45%') // attack
    expect(result).toContain('30%') // expand
    expect(result).toContain('25%') // defend
  })

  it('includes foreign policy', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'MDK',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toContain('MDK')
  })

  it('counts live opponents correctly', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    // 2 live opponents (index 0 is -1/dead)
    expect(result).toContain('2')
  })

  it('handles missing myScore gracefully', () => {
    const game = makeGame({ myScore: undefined })
    expect(() =>
      formatGameState(game, makeIntel(), 'EXPLORE',
        { attack: 0.33, expand: 0.34, defend: 0.33 },
        loadMemory()),
    ).not.toThrow()
  })

  it('handles empty intel gracefully', () => {
    const emptyIntel = { threats: [], myTopArmies: [] }
    expect(() =>
      formatGameState(makeGame(), emptyIntel, 'EXPLORE',
        { attack: 0.33, expand: 0.34, defend: 0.33 },
        loadMemory()),
    ).not.toThrow()
  })

  it('includes a per-opponent line with distance when the general is known', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toMatch(/#1 armies=200 tiles=30/)
    expect(result).toMatch(/genKnown=yes dist=\d+/)
  })

  it('shows genKnown=no and dist=n/a for opponents with unknown generals', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toMatch(/#2 armies=50 tiles=10.*genKnown=no dist=n\/a/)
  })

  it('includes the current situational bucket line', () => {
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      loadMemory(),
    )
    expect(result).toMatch(/Situation "mid\|/)
  })

  it('includes recent lessons when present in memory', () => {
    const mem = addLesson(loadMemory(), { result: 'won', text: 'push attack earlier' })
    const result = formatGameState(
      makeGame(), makeIntel(), 'EXPAND',
      { attack: 0.45, expand: 0.30, defend: 0.25 },
      mem,
    )
    expect(result).toContain('push attack earlier')
  })

  it('omits opponent/lesson sections with no opponents and no lessons', () => {
    const game = makeGame({ opponents: [] })
    const result = formatGameState(game, makeIntel(), 'EXPLORE',
      { attack: 0.33, expand: 0.34, defend: 0.33 },
      loadMemory())
    expect(result).not.toContain('Opponents (')
    expect(result).not.toContain('Lessons from past games:')
  })
})
