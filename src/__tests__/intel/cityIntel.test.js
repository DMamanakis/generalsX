import { getCapturableCities, getMyCities, findBestCityCapture, getDefenseTarget } from '../../intel/cityIntel'
import { initializeGameState } from '../../testUtils/testHelper'
import { buildGameMap } from '../../core/gameMap'
import { gatherIntel } from '../../intel/intelGathering'

function makeGame(overrides = {}) {
  return {
    playerIndex: 1,
    terrain: [],
    armies: [],
    knownCities: [],
    teams: null,
    team: null,
    ...overrides,
  }
}

describe('getCapturableCities', () => {
  it('returns an empty array when there are no known cities', () => {
    expect(getCapturableCities(makeGame())).toEqual([])
  })

  it('excludes cities I currently own', () => {
    const terrain = []
    terrain[5] = 1 // owned by me (playerIndex 1)
    const armies = []
    armies[5] = 10
    expect(getCapturableCities(makeGame({ knownCities: [5], terrain, armies }))).toEqual([])
  })

  it('excludes cities owned by a teammate', () => {
    const terrain = []
    terrain[5] = 2 // owned by player 2
    const armies = []
    armies[5] = 10
    const game = makeGame({ knownCities: [5], terrain, armies, teams: [1, 1, 1], team: 1 })
    expect(getCapturableCities(game)).toEqual([])
  })

  it('includes neutral and enemy cities, sorted cheapest-garrison-first', () => {
    const terrain = []
    terrain[5] = -1 // neutral
    terrain[8] = 3 // enemy-owned
    const armies = []
    armies[5] = 40
    armies[8] = 10
    const game = makeGame({ knownCities: [5, 8], terrain, armies })
    expect(getCapturableCities(game)).toEqual([
      { idx: 8, armies: 10 },
      { idx: 5, armies: 40 },
    ])
  })

  it('defaults a missing garrison value to 0', () => {
    const terrain = []
    terrain[5] = -1
    const game = makeGame({ knownCities: [5], terrain, armies: [] })
    expect(getCapturableCities(game)).toEqual([{ idx: 5, armies: 0 }])
  })
})

describe('getMyCities', () => {
  it('returns an empty array when there are no known cities', () => {
    expect(getMyCities(makeGame())).toEqual([])
  })

  it('returns only cities I currently own', () => {
    const terrain = []
    terrain[5] = 1
    terrain[8] = 0
    const game = makeGame({ knownCities: [5, 8], terrain })
    expect(getMyCities(game)).toEqual([5])
  })
})

describe('findBestCityCapture', () => {
  it('returns null when there are no top armies', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    expect(findBestCityCapture(game, { myTopArmies: [] }, 1)).toBeNull()
  })

  it('returns null when no known city is affordable', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.cities = [24]
    game.knownCities = [24]
    game.armies[24] = 100
    const intel = gatherIntel(game)
    expect(findBestCityCapture(game, intel, 1)).toBeNull()
  })

  it('targets a city known only through fog (in knownCities but not the visible cities list)', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.cities = [] // not currently visible
    game.knownCities = [24] // scouted previously, now fogged
    game.armies[24] = 5
    const intel = gatherIntel(game)
    const best = findBestCityCapture(game, intel, 1)
    expect(best).not.toBeNull()
    expect(best.city.idx).toBe(24)
  })

  it('picks the closer of two armies that can both afford the same city, not just the largest', () => {
    const game = initializeGameState('empty', 'twoLargeArmies')
    // idx 6 (general, 15 armies) and idx 10 (10 armies) can both afford a 5-garrison city.
    // City at idx 20 sits two steps from idx 10 (via idx 15) but farther from idx 6.
    game.cities = [20]
    game.knownCities = [20]
    game.armies[20] = 5

    const intel = gatherIntel(game)
    const best = findBestCityCapture(game, intel, 1)
    expect(best).not.toBeNull()
    expect(best.source.idx).toBe(10)
  })

  it('falls back to a reachable smaller army when the largest army is walled off', () => {
    const game = initializeGameState('empty', 'twoLargeArmies')
    // Wall the general (idx 6, 15 armies) in on all four sides — it can reach nothing.
    game.terrain[1] = -2
    game.terrain[5] = -2
    game.terrain[7] = -2
    game.terrain[11] = -2
    buildGameMap(game)

    game.cities = [20]
    game.knownCities = [20]
    game.armies[20] = 5

    const intel = gatherIntel(game)
    const best = findBestCityCapture(game, intel, 1)
    expect(best).not.toBeNull()
    expect(best.source.idx).toBe(10)
    expect(best.city.idx).toBe(20)
  })
})

describe('getDefenseTarget', () => {
  it('returns the general location when there are no threats', () => {
    expect(getDefenseTarget({ myGeneralLocationIndex: 6 }, { threats: [] })).toBe(6)
  })

  it('returns the general location when a general-level threat exists, even alongside a city threat', () => {
    const intel = { threats: [{ type: 'ADJACENT_TO_GENERAL' }, { type: 'ADJACENT_TO_CITY', cityIdx: 20 }] }
    expect(getDefenseTarget({ myGeneralLocationIndex: 6 }, intel)).toBe(6)
  })

  it('returns the threatened city when only a city threat exists', () => {
    const intel = { threats: [{ type: 'ADJACENT_TO_CITY', cityIdx: 20 }] }
    expect(getDefenseTarget({ myGeneralLocationIndex: 6 }, intel)).toBe(20)
  })

  it('returns the general location (falsy) when there is no general', () => {
    const intel = { threats: [{ type: 'ADJACENT_TO_CITY', cityIdx: 20 }] }
    expect(getDefenseTarget({ myGeneralLocationIndex: null }, intel)).toBeNull()
  })

  it('defaults threats to [] when intel.threats is missing', () => {
    expect(getDefenseTarget({ myGeneralLocationIndex: 6 }, {})).toBe(6)
  })
})
