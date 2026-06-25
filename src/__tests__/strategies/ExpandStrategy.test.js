import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('ExpandStrategy', () => {
  describe('default config', () => {
    let strategy

    beforeEach(() => {
      strategy = new ExpandStrategy()
    })

    it('should use minArmySize: 2 by default', () => {
      expect(strategy.config.minArmySize).toBe(2)
    })

    it('should return true when armies can capture neighboring tiles', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(true)
    })

    it('should return false when policy is DEFEND', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false with no top armies', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return CREEP moves when captures are available', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('CREEP'))
    })
  })

  describe('custom config: minArmySize', () => {
    it('should return false when all armies are below minArmySize', () => {
      const strategy = new ExpandStrategy({ minArmySize: 50 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // allArmiesOnGeneral puts 25 armies at index 6 — below our threshold of 50
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return true when an army meets the minArmySize threshold', () => {
      const strategy = new ExpandStrategy({ minArmySize: 20 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // allArmiesOnGeneral puts 25 armies at index 6 — above our threshold of 20
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(true)
    })

    it('should exclude armies below minArmySize from generateMoves', () => {
      const strategy = new ExpandStrategy({ minArmySize: 50 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      // No army meets threshold — generateMoves should return empty
      const moves = strategy.generateMoves(game, intel)
      expect(moves).toEqual([])
    })
  })
})
