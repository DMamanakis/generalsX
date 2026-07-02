import { computeContextBucket, manhattanDistance } from '../../ai/aiContext'

function makeGame({ turn = 50, myTotal = 100, opponents = [] } = {}) {
  return {
    turn,
    myScore: { total: myTotal, tiles: 10 },
    opponents,
  }
}

describe('computeContextBucket', () => {
  it('classifies early phase before turn 100', () => {
    expect(computeContextBucket(makeGame({ turn: 50 }))).toMatch(/^early\|/)
  })

  it('classifies mid phase between 100 and 249', () => {
    expect(computeContextBucket(makeGame({ turn: 150 }))).toMatch(/^mid\|/)
  })

  it('classifies late phase at 250+', () => {
    expect(computeContextBucket(makeGame({ turn: 300 }))).toMatch(/^late\|/)
  })

  it('classifies parity as ahead when far stronger than the strongest opponent', () => {
    const game = makeGame({ myTotal: 200, opponents: [{ dead: false, total: 100, tiles: 10 }] })
    expect(computeContextBucket(game)).toBe('early|ahead')
  })

  it('classifies parity as behind when far weaker than the strongest opponent', () => {
    const game = makeGame({ myTotal: 50, opponents: [{ dead: false, total: 100, tiles: 10 }] })
    expect(computeContextBucket(game)).toBe('early|behind')
  })

  it('classifies parity as even within the ahead/behind thresholds', () => {
    const game = makeGame({ myTotal: 100, opponents: [{ dead: false, total: 100, tiles: 10 }] })
    expect(computeContextBucket(game)).toBe('early|even')
  })

  it('defaults parity to even with no live opponents', () => {
    expect(computeContextBucket(makeGame({ myTotal: 100, opponents: [] }))).toBe('early|even')
  })

  it('ignores dead opponents when computing parity', () => {
    const game = makeGame({
      myTotal: 200,
      opponents: [{ dead: true, total: 1000, tiles: 50 }, { dead: false, total: 50, tiles: 5 }],
    })
    expect(computeContextBucket(game)).toBe('early|ahead')
  })
})

describe('manhattanDistance', () => {
  it('computes distance between two tiles on a grid', () => {
    // width 5: idx 0 = (row0,col0); idx 12 = (row2,col2)
    expect(manhattanDistance(0, 12, 5)).toBe(4)
  })

  it('returns 0 for the same tile', () => {
    expect(manhattanDistance(7, 7, 5)).toBe(0)
  })

  it('returns null when either index is missing', () => {
    expect(manhattanDistance(null, 5, 5)).toBeNull()
    expect(manhattanDistance(5, undefined, 5)).toBeNull()
  })

  it('returns null when either index is negative', () => {
    expect(manhattanDistance(-1, 5, 5)).toBeNull()
  })

  it('returns null when width is missing', () => {
    expect(manhattanDistance(0, 5, null)).toBeNull()
  })
})
