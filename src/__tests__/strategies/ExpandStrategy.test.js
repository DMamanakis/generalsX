import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('ExpandStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new ExpandStrategy()
  })

  describe('evaluate()', () => {
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
  })

  describe('generateMoves()', () => {
    it('should return CREEP moves when captures are available', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)

      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('CREEP'))
    })

    it('should return empty array with no top armies', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      const moves = strategy.generateMoves(game, intel)
      expect(moves).toEqual([])
    })
  })
})
