import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('gatherIntel', () => {
  it('should categorize empty territories correctly', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const intel = gatherIntel(game)

    // In 'empty' terrain, player 1 owns indices 6 and 10; index 24 is owned by player 0
    // All others are TERRAIN_EMPTY (-1)
    expect(intel.emptyTerritories.length).toBeGreaterThan(0)
    intel.emptyTerritories.forEach(loc => expect(loc.terrain).toBe(-1))
  })

  it('should categorize visible opponent territories', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const intel = gatherIntel(game)

    // Index 24 has terrain = 0 (player 0 = opponent)
    expect(intel.visibleOpponentTerritories.length).toBeGreaterThan(0)
    intel.visibleOpponentTerritories.forEach(loc => {
      expect(loc.terrain).not.toBe(game.playerIndex)
      expect(loc.terrain).toBeGreaterThan(-1)
    })
  })

  it('should identify owned armies sorted largest first', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const intel = gatherIntel(game)

    expect(intel.myArmies.length).toBeGreaterThan(0)
    for (let i = 0; i < intel.myArmies.length - 1; i++) {
      expect(intel.myArmies[i].armies).toBeGreaterThanOrEqual(intel.myArmies[i + 1].armies)
    }
  })

  it('should mark player as undiscovered when no opponent territory is visible', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // Remove all opponent tiles to simulate undiscovered state
    game.terrain[24] = -1
    game.opponents = []
    const intel = gatherIntel(game)

    expect(intel.undiscovered).toBe(true)
  })

  it('should populate foggedTerritories in foggy terrain', () => {
    const game = initializeGameState('foggy', 'allArmiesOnGeneral')
    const intel = gatherIntel(game)

    expect(intel.foggedTerritories.length).toBeGreaterThan(0)
    intel.foggedTerritories.forEach(loc => expect(loc.terrain).toBe(-3))
  })

  it('should include threats array in returned intel', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const intel = gatherIntel(game)
    expect(Array.isArray(intel.threats)).toBe(true)
  })

  it('should detect a threat when an enemy is adjacent to our general', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    // General is at index 6; place an enemy at index 7 (adjacent)
    game.terrain[7] = 0
    game.armies[7] = 5
    const intel = gatherIntel(game)
    expect(intel.threats.some(t => t.type === 'ADJACENT_TO_GENERAL')).toBe(true)
  })

  it('should create a fresh unexploredTerritories set on turn 1', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 1
    const intel = gatherIntel(game)
    expect(intel.unexploredTerritories).toBeInstanceOf(Set)
    // Own tiles (6, 10) should already be removed from the fresh set
    expect(intel.unexploredTerritories.has(6)).toBe(false)
    expect(intel.unexploredTerritories.has(10)).toBe(false)
  })

  it('should preserve unexploredTerritories from prevIntel across turns', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 30
    const prevSet = new Set([1, 2, 3])
    const prevIntel = {unexploredTerritories: prevSet}
    const intel = gatherIntel(game, prevIntel)
    expect(intel.unexploredTerritories).toBe(prevSet)
  })

  it('should build a fresh unexploredTerritories set when prevIntel has none', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 30
    const intel = gatherIntel(game, {})
    expect(intel.unexploredTerritories).toBeInstanceOf(Set)
    expect(intel.unexploredTerritories).not.toBeNull()
  })
})
