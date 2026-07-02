import { DefendStrategy } from '../../strategies/DefendStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'
import * as pathfindingUtils from '../../utils/pathfinding'
import * as attackQueueUtils from '../../utils/attackQueue'

describe('DefendStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new DefendStrategy()
  })

  describe('evaluate()', () => {
    it('should return false when policy is not DEFEND', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPLORE)).toBe(false)
    })

    it('should return false when policy is DEFEND but no threats', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      const intel = gatherIntel(game)
      // No enemies adjacent to general, no general nearby — threats should be empty
      intel.threats = []
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return true when policy is DEFEND and an enemy is adjacent to our general', () => {
      const game = initializeGameState('empty', 'twoLargeArmies')
      // General is at index 6; place enemy at index 7 (adjacent)
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(true)
    })
  })

  describe('generateMoves()', () => {
    it('should return DEFEND moves routing toward the general', () => {
      const game = initializeGameState('empty', 'twoLargeArmies')
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('DEFEND'))
    })

    it('should return empty array when no threats', () => {
      const game = initializeGameState('empty', 'twoLargeArmies')
      const intel = gatherIntel(game)
      intel.threats = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return empty array when no top armies available', () => {
      const game = initializeGameState('empty', 'twoLargeArmies')
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return empty array when the only top army is the general itself', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Only the general (idx 6, 25 armies) qualifies as a top army; the other tile
      // (idx 10) has just 1 army, below the useful-army threshold.
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      expect(intel.myTopArmies.length).toBe(1)
      expect(intel.myTopArmies[0].idx).toBe(6)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return empty array when findPath yields a degenerate (same-tile) path', () => {
      const spy = jest.spyOn(pathfindingUtils, 'findPath').mockReturnValue([{ idx: 6 }])
      const game = initializeGameState('empty', 'twoLargeArmies')
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      expect(moves).toEqual([])
    })

    it('should skip pushing a move when makeAttackQueueObject returns null', () => {
      const spy = jest.spyOn(attackQueueUtils, 'makeAttackQueueObject').mockReturnValue(null)
      const game = initializeGameState('empty', 'twoLargeArmies')
      game.terrain[7] = 0
      game.armies[7] = 5
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      expect(moves).toEqual([])
    })
  })
})
