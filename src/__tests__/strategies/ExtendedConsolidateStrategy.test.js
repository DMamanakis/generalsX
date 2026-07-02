import { ExtendedConsolidateStrategy } from '../../strategies/ExtendedConsolidateStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'
import * as pathfindingUtils from '../../utils/pathfinding'
import * as attackQueueUtils from '../../utils/attackQueue'

describe('ExtendedConsolidateStrategy', () => {
  describe('default config', () => {
    let strategy

    beforeEach(() => {
      strategy = new ExtendedConsolidateStrategy()
    })

    it('should default to minArmySize: 1 and minDistanceToConsolidate: 2', () => {
      expect(strategy.config.minArmySize).toBe(1)
      expect(strategy.config.minDistanceToConsolidate).toBe(2)
    })

    it('should return false when policy is not DEFEND', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return true during DEFEND when there are armies away from the general', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      // cornerArmies has armies spread across tiles 0,1,2,5,6,7,11 — general at 6
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(true)
    })

    it('should return CONSOLIDATE moves routing toward the general', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('CONSOLIDATE'))
    })

    it('should return false in evaluate when there are no armies at all', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      intel.myArmies = []
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return empty array in generateMoves when there are no armies at all', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      intel.myArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return empty array when findPath yields a degenerate (same-tile) path', () => {
      const spy = jest.spyOn(pathfindingUtils, 'findPath').mockReturnValue([{ idx: 6 }])
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      expect(moves).toEqual([])
    })

    it('should skip pushing a move when makeAttackQueueObject returns null', () => {
      const spy = jest.spyOn(attackQueueUtils, 'makeAttackQueueObject').mockReturnValue(null)
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      expect(moves).toEqual([])
    })
  })

  describe('custom config: minArmySize', () => {
    it('should ignore armies below minArmySize', () => {
      const strategy = new ExtendedConsolidateStrategy({ minArmySize: 10 })
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      // cornerArmies has armies of size 5 — all below threshold of 10
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should include armies at or above minArmySize', () => {
      const strategy = new ExtendedConsolidateStrategy({ minArmySize: 4 })
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      // cornerArmies has armies of size 5 — above threshold of 4
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(true)
    })
  })

  describe('custom config: minDistanceToConsolidate', () => {
    it('should ignore armies that are already close to the general', () => {
      // With a very high distance requirement, no army qualifies on a 5×5 map
      const strategy = new ExtendedConsolidateStrategy({ minDistanceToConsolidate: 99 })
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return empty array from generateMoves when no candidates meet the thresholds', () => {
      const strategy = new ExtendedConsolidateStrategy({ minDistanceToConsolidate: 99 })
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })

  describe('scoring reduce edge cases', () => {
    it('falls back to a score of 0 for candidates with a falsy recorded distance, and keeps the current best when a later candidate scores lower', () => {
      // Real BFS distance is never falsy (0) for a non-general candidate, since the general's
      // own tile is always excluded from candidates. Mock the distance map to exercise the
      // `|| 0` fallback (for both the initial "best" and a compared "army") and the branch of
      // the score comparison where the current best is retained.
      const strategy = new ExtendedConsolidateStrategy({ minDistanceToConsolidate: 0 })
      const spy = jest.spyOn(pathfindingUtils, 'createDistanceMap').mockReturnValue({ 0: 0, 7: 5, 11: 1 })
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      // idx 7 (score 5*5=25) should win over idx 0 (falsy dist, score 0) and idx 11 (score 1*5=5)
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[0].attackerIndex).toBe(7)
    })
  })

  describe('target selection', () => {
    it('should prefer the highest armies × distance army over simply the farthest', () => {
      const strategy = new ExtendedConsolidateStrategy()
      const game = initializeGameState('occupiedCorner', 'twoLargeArmies')
      // occupiedCorner: playerIndex=1 tiles at 0,1,5,6,7,11
      // twoLargeArmies: idx 6=15 (general), rest=-1 for our tiles
      // Override: give idx 0 (distance 2 from general) 20 armies
      // idx 0 is the only non-general army candidate with armies >= 1
      game.armies[0] = 20
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // moves[0] = first step out of source (attackerIndex = idx 0)
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[0].attackerIndex).toBe(0)
    })

    it('should pick army with highest armies × distance score over just farthest', () => {
      const strategy = new ExtendedConsolidateStrategy()
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      // cornerArmies: all our tiles have 5 armies
      // Override idx 0 (distance 2 from general at idx 6) with 100 armies
      // Score: idx 0 = 2×100=200, idx 11 (dist ~3) = 3×5=15 → idx 0 wins
      game.armies[0] = 100
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // moves[0] = first step out of source (attackerIndex = idx 0)
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[0].attackerIndex).toBe(0)
    })
  })
})
