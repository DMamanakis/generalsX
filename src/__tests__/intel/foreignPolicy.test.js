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

  it('should return MURDER when we found a general and are stronger', () => {
    // 'empty' terrain already has opponent (player 0) at index 24
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.turn = 150
    game.generals = [24]
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9, generalLocationIndex: 24}
    game.myScore = {total: 25, tiles: 5}
    const intel = gatherIntel(game)

    // Verify undiscovered=false (opponent at idx 24 makes us discovered)
    expect(intel.undiscovered).toBe(false)
    expect(determineForeignPolicy(game, intel)).toBe(FOREIGN_POLICY.MURDER)
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
})
