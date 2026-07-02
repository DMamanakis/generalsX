import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'
import { getLocationObject } from '../../core/locationObject'

describe('ExploreStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new ExploreStrategy()
  })

  describe('evaluate()', () => {
    it('should return false when policy is not EXPLORE or EXPAND', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false when there are no top armies and no fogged or unexplored territory', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.armies[6] = 1 // below usefulArmyThreshold — no top armies
      const intel = gatherIntel(game, { unexploredTerritories: new Set() })
      expect(intel.myTopArmies.length).toBe(0)
      expect(intel.foggedTerritories.length).toBe(0)
      expect(intel.unexploredTerritories.size).toBe(0)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPLORE)).toBe(false)
    })

    it('should return true when top armies exist and unexploredTerritories is non-empty', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(intel.foggedTerritories.length).toBe(0)
      expect(intel.unexploredTerritories.size).toBeGreaterThan(0)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPLORE)).toBe(true)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(true)
    })

    it('should return true when top armies exist and foggedTerritories is non-empty', () => {
      const game = initializeGameState('foggy', 'allArmiesOnGeneral')
      const intel = gatherIntel(game, { unexploredTerritories: new Set() })
      expect(intel.foggedTerritories.length).toBeGreaterThan(0)
      expect(intel.unexploredTerritories.size).toBe(0)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPLORE)).toBe(true)
    })
  })

  describe('generateMoves()', () => {
    it('should return EXPLORE moves toward the darkest tile', () => {
      const game = initializeGameState('foggy', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('EXPLORE'))
    })

    it('should return an empty array when there are no top armies', () => {
      const game = initializeGameState('foggy', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return an empty array when the darkness map has no positive-darkness tile', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      // 'empty' terrain has no fog — every tile is already visible with darkness 0.
      // Clearing game.locations forces createDarknessMap to seed nothing at all,
      // leaving darknessMap empty and highestDarknessIdx at its initial -1.
      game.locations = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return an empty array when the path to the darkest tile has length <= 1', () => {
      const game = initializeGameState('foggy', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      // idx 24 is the darkest tile for this terrain; using it as the source too
      // makes findPath resolve to a single-element (target-only) path.
      intel.myTopArmies = [getLocationObject({ locationIdx: 24, game })]
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })
})
