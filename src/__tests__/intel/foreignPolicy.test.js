import { determineForeignPolicy, FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { initializeGameState } from '../../testUtils/testHelper'
import { gatherIntel } from '../../intel/intelGathering'

describe('determineForeignPolicy', () => {
  it('should return EXPLORE before turn 100', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 50
    const intel = gatherIntel(game)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.EXPLORE)
  })

  it('should return EXPAND after turn 100 when undiscovered', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    // Remove all opponent tiles so undiscovered stays true
    game.terrain[24] = -1
    game.opponents = []
    const intel = gatherIntel(game)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.EXPAND)
  })

  it('should return MDK when we found a general and are stronger', () => {
    // 'empty' terrain already has opponent (player 0) at index 24
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    game.generals = [24]
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9, generalLocationIndex: 24}
    game.myScore = {total: 25, tiles: 5}
    const intel = gatherIntel(game)

    // Verify undiscovered=false (opponent at idx 24 makes us discovered)
    expect(intel.undiscovered).toBe(false)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.MDK)
  })

  it('should return DEFEND when we found a general and we are weaker', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    game.generals = [24]
    game.opponents[0] = {color: 'RED', dead: false, tiles: 10, total: 100, availableArmies: 90, generalLocationIndex: 24}
    game.myScore = {total: 5, tiles: 2}
    const intel = gatherIntel(game)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.DEFEND)
  })

  it('should skip a teammate general (continue) and return EXPAND when no real enemy general is known', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    // Player 0 (idx24) is our teammate with a known general — should be skipped via `continue`.
    // Player 2 (idx20) is a real, different-team enemy with an unknown general, so intel stays
    // "discovered" (undiscovered=false) and the generals loop actually runs and reaches player 0.
    game.terrain[20] = 2
    game.generals = [24, undefined, -1]
    game.teams = [1, 1, 0]
    game.team = 1
    game.opponents[0] = {color: 'BLUE', dead: false, tiles: 10, total: 100, availableArmies: 90, generalLocationIndex: 24}
    game.opponents[2] = {color: 'GREEN', dead: false, tiles: 5, total: 50, availableArmies: 45}
    game.myScore = {total: 200, tiles: 20}
    const intel = gatherIntel(game)

    expect(intel.undiscovered).toBe(false)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.EXPAND)
  })

  it('should return MDK for a real enemy on a different team (teams set but not matching)', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    game.generals = [24]
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9, generalLocationIndex: 24}
    game.myScore = {total: 200, tiles: 20}
    // Teams are in play, but player 0 is on a different team than us — not a teammate
    game.teams = [2, 1]
    game.team = 1
    const intel = gatherIntel(game)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.MDK)
  })

  it('should return EXPAND when opponent territory is visible but no general has been found', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    // Opponent at idx 24 is visible (undiscovered=false) but its general location is unknown (-1)
    game.generals = [-1]
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9}
    const intel = gatherIntel(game)
    expect(intel.undiscovered).toBe(false)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.EXPAND)
  })
})
