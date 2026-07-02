import { ConsolidateStrategy } from '../../strategies/ConsolidateStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('ConsolidateStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new ConsolidateStrategy()
  })

  describe('evaluate()', () => {
    it('should return false when policy is not DEFEND', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return false when there are no top armies', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false when myGeneralLocationIndex is falsy', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      game.myGeneralLocationIndex = null
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBeFalsy()
    })

    it('should return false when the only top army is the general itself', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // allArmiesOnGeneral: idx6=25 (general), idx10=1 (below usefulArmyThreshold) — only the general qualifies
      const intel = gatherIntel(game)
      expect(intel.myTopArmies.length).toBe(1)
      expect(intel.myTopArmies[0].idx).toBe(game.myGeneralLocationIndex)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return true when there are top armies away from the general', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(true)
    })
  })

  describe('generateMoves()', () => {
    it('should return CONSOLIDATE moves routing the farthest army toward the general', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('CONSOLIDATE'))
      expect(moves[moves.length - 1].targetIndex).toBe(game.myGeneralLocationIndex)
    })

    it('should return an empty array when there is no general location', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      game.myGeneralLocationIndex = null
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return an empty array when there are no non-general candidates', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return an empty array when the path to the general has length <= 1', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      // String idx coerces to the same array slot as the general's numeric idx, so the
      // BFS distance map seeds source and target at the same location and findPath
      // resolves to a single-element (target-only) path.
      intel.myTopArmies = [{ idx: String(game.myGeneralLocationIndex), armies: 25 }]
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })
})
