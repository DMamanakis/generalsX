import { detectThreats } from '../../intel/threatDetection'
import { initializeGameState } from '../../testUtils/testHelper'
import { buildGameMap } from '../../core/gameMap'

describe('detectThreats', () => {
  it('should return an empty array when myGeneralLocationIndex is missing', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.myGeneralLocationIndex = undefined
    expect(detectThreats(game)).toEqual([])
  })

  it('should return an empty array when locationObjectMap is missing', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.locationObjectMap = null
    expect(detectThreats(game)).toEqual([])
  })

  it('should return an empty array when the general location cannot be resolved from the map', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // Empty map means locationObjectMap[row] is undefined for any row
    game.locationObjectMap = []
    expect(detectThreats(game)).toEqual([])
  })

  it('should flag an adjacent enemy as a HIGH urgency threat', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // General is at idx 6; place a non-team enemy at idx 7 (adjacent)
    game.terrain[7] = 0
    game.armies[7] = 5
    buildGameMap(game)

    const threats = detectThreats(game)
    const threat = threats.find(t => t.type === 'ADJACENT_TO_GENERAL')
    expect(threat).toBeDefined()
    expect(threat.urgency).toBe('HIGH')
  })

  it('should not flag an adjacent teammate as a threat', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.team = 1
    game.teams = [1, 1] // player 0 (adjacent tile owner) is our teammate
    game.terrain[7] = 0
    game.armies[7] = 5
    buildGameMap(game)

    const threats = detectThreats(game)
    expect(threats.some(t => t.type === 'ADJACENT_TO_GENERAL')).toBe(false)
  })

  it('should flag a known enemy general within distance 3 as CRITICAL urgency', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // idx7 (row1,col2) is distance 1 from our general at idx6 (row1,col1)
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, generalLocationIndex: 7}
    buildGameMap(game)

    const threats = detectThreats(game)
    const threat = threats.find(t => t.type === 'ENEMY_GENERAL_NEARBY')
    expect(threat).toBeDefined()
    expect(threat.urgency).toBe('CRITICAL')
    expect(threat.distance).toBeLessThanOrEqual(3)
  })

  it('should flag a known enemy general within distance 4-6 as MEDIUM urgency', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // idx24 (row4,col4) is distance 6 from our general at idx6 (row1,col1)
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, generalLocationIndex: 24}
    buildGameMap(game)

    const threats = detectThreats(game)
    const threat = threats.find(t => t.type === 'ENEMY_GENERAL_NEARBY')
    expect(threat).toBeDefined()
    expect(threat.urgency).toBe('MEDIUM')
    expect(threat.distance).toBeGreaterThan(3)
    expect(threat.distance).toBeLessThanOrEqual(6)
  })

  it('should ignore dead opponents and opponents with unknown generals', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.opponents[0] = {color: 'RED', dead: true, tiles: 1, total: 10, generalLocationIndex: 7}
    buildGameMap(game)

    const threats = detectThreats(game)
    expect(threats.some(t => t.type === 'ENEMY_GENERAL_NEARBY')).toBe(false)
  })
})
