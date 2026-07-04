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

  describe('city-aware rally point', () => {
    it('should consolidate toward a threatened owned city instead of the general when the general itself is not threatened', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      game.knownCities = [11] // an already-owned corner tile, now flagged as a city
      game.terrain[16] = 0 // enemy adjacent to the city, not the general
      game.armies[16] = 5
      const intel = gatherIntel(game)
      expect(intel.threats.some(t => t.type === 'ADJACENT_TO_CITY')).toBe(true)
      expect(intel.threats.some(t => t.type === 'ADJACENT_TO_GENERAL' || t.type === 'ENEMY_GENERAL_NEARBY')).toBe(false)

      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[moves.length - 1].targetIndex).toBe(11)
    })

    it('should still consolidate toward the general when both the general and a city are threatened', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      game.terrain[7] = 0 // enemy adjacent to the general
      game.armies[7] = 5
      game.knownCities = [11]
      game.terrain[16] = 0
      game.armies[16] = 5
      const intel = gatherIntel(game)
      expect(intel.threats.some(t => t.type === 'ADJACENT_TO_GENERAL')).toBe(true)
      expect(intel.threats.some(t => t.type === 'ADJACENT_TO_CITY')).toBe(true)

      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[moves.length - 1].targetIndex).toBe(game.myGeneralLocationIndex)
    })
  })
})
