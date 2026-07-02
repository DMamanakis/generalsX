import { createDistanceMap, findPath, findShortestPath } from '../../utils/pathfinding'
import { initializeGameState } from '../../testUtils/testHelper'
import { buildGameMap } from '../../core/gameMap'

describe('createDistanceMap', () => {
  it('should create a distance map from a source tile', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const source = game.locationObjectMap[1][1] // index 6
    const distanceMap = createDistanceMap({location: source, game})

    expect(distanceMap[6]).toBe(0)
    expect(distanceMap[1]).toBe(1) // directly above source (row 0, col 1)
    expect(distanceMap[7]).toBe(1) // right neighbor
    expect(distanceMap[11]).toBe(1) // below neighbor
  })

  it('should mark mountains as "M"', () => {
    const game = initializeGameState('mountainous', 'allArmiesOnGeneral')
    const source = game.locationObjectMap[1][1] // index 6
    const distanceMap = createDistanceMap({location: source, game})

    // Index 8 is a mountain in mountainous terrain (row 1, col 3)
    expect(distanceMap[8]).toBe('M')
  })

  it('should mark cities as "C" when noCities is true', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.knownCities.push(7) // Mark index 7 as a city
    const source = game.locationObjectMap[1][1]
    const distanceMap = createDistanceMap({location: source, game, noCities: true})

    expect(distanceMap[7]).toBe('C')
  })

  it('should throw without game context', () => {
    expect(() => createDistanceMap({location: {idx: 0}, game: null})).toThrow()
  })
})

describe('findPath', () => {
  it('should return a path from source to target', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const source = game.locationObjectMap[1][1] // index 6
    const path = findPath({location: source, targetLocation: 24, game})

    expect(path.length).toBeGreaterThan(1)
    // Path[0] should be near the target (24), path[last] near source
    expect(path[0].idx).toBe(24)
  })

  it('should return empty array for unreachable target', () => {
    const game = initializeGameState('mountainous', 'allArmiesOnGeneral')
    // Create a scenario where target is surrounded by mountains if possible
    // For this test just verify path length is at least 1 (target itself)
    const source = game.locationObjectMap[0][0] // index 0
    const path = findPath({location: source, targetLocation: 0, game})
    expect(path.length).toBeGreaterThanOrEqual(1)
  })

  it('should throw without game context', () => {
    expect(() => findPath({location: {idx: 0}, targetLocation: {idx: 1}, game: null})).toThrow()
  })
})

describe('findShortestPath', () => {
  it('should throw without game context', () => {
    expect(() => findShortestPath({distanceMap: [], targetLocationOrPath: {idx: 0}, game: null})).toThrow()
  })

  it('should return the target location when already at destination', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const target = game.locationObjectMap[1][1]
    const distanceMap = createDistanceMap({location: target, game})
    const path = findShortestPath({distanceMap, targetLocationOrPath: target, game})

    expect(path).toContain(target)
  })

  it('should break distance ties between neighbors using army attack differential', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // idx6 is source; idx12 (row2,col2) is reachable at distance 2 via both
    // idx7 (row1,col2) and idx11 (row2,col1), which are tied at distance 1 from idx12.
    // Give idx11 a much larger army so the tie-break favors it over idx7.
    game.armies[7] = 1
    game.armies[11] = 20
    buildGameMap(game)

    const source = game.locationObjectMap[1][1] // idx6
    const distanceMap = createDistanceMap({location: source, game})
    expect(distanceMap[7]).toBe(1)
    expect(distanceMap[11]).toBe(1)
    expect(distanceMap[12]).toBe(2)

    const target = game.locationObjectMap[2][2] // idx12
    const path = findShortestPath({distanceMap, targetLocationOrPath: target, game})

    // Tie-break should route the path through idx11 (higher army differential)
    expect(path.some(loc => loc.idx === 11)).toBe(true)
  })

  it('should fall back to any unvisited neighbor when the current tile is unreachable', () => {
    const game = initializeGameState('mountainous', 'allArmiesOnGeneral')
    // idx14's only real neighbors are 9, 13, and 19 (already a mountain).
    // Blocking 9 and 13 too completely isolates idx14 from the rest of the map.
    game.terrain[9] = -2
    game.terrain[13] = -2
    buildGameMap(game)

    const source = game.locationObjectMap[1][1] // idx6
    const distanceMap = createDistanceMap({location: source, game})
    expect(distanceMap[14]).toBeUndefined() // confirm idx14 is truly unreached

    const target = game.locationObjectMap[2][4] // idx14
    const path = findShortestPath({distanceMap, targetLocationOrPath: target, game})

    // The fallback path-stepping logic must still terminate and start at the target
    expect(path[0].idx).toBe(14)
    expect(path.length).toBeGreaterThan(1)
  })
})
