import { CaptureStrategy } from '../../strategies/CaptureStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'
import * as attackQueueUtils from '../../utils/attackQueue'

describe('CaptureStrategy', () => {
  describe('default config', () => {
    let strategy

    beforeEach(() => {
      strategy = new CaptureStrategy()
    })

    it('should use cityArmyBuffer: 1 by default', () => {
      expect(strategy.config.cityArmyBuffer).toBe(1)
    })

    it('should return false when policy is EXPLORE or DEFEND', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 5
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPLORE)).toBe(false)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false when no cities are present', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.cities = []
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return true when a city is affordable', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Top army has 25; city at idx 24 has 5 armies — 25 > 5 + 1 ✓
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 5
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(true)
    })

    it('should return empty array from generateMoves when there are no top armies', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 5
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should sort multiple affordable cities by army count and target the cheapest', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Top army has 25; both cities are affordable (25 > armies + 1)
      game.cities = [20, 24]
      game.knownCities = [20, 24]
      game.armies[20] = 8
      game.armies[24] = 5
      game.terrain[20] = -1
      game.terrain[24] = -1
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      // Cheapest city (24) should be targeted first
      expect(moves[moves.length - 1].targetIndex).toBe(24)
    })

    it('should skip a city that resolves to a same-tile (path length 1) path', () => {
      const negativeBufferStrategy = new CaptureStrategy({ cityArmyBuffer: -1 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // City is our own top-army tile (idx 6); negative buffer makes it "affordable" against itself
      game.cities = [6]
      game.knownCities = [6]
      const intel = gatherIntel(game)
      expect(negativeBufferStrategy.generateMoves(game, intel)).toEqual([])
    })

    it('should skip pushing a move when makeAttackQueueObject returns null', () => {
      const spy = jest.spyOn(attackQueueUtils, 'makeAttackQueueObject').mockReturnValue(null)
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 5
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      spy.mockRestore()
      expect(moves).toEqual([])
    })
  })

  describe('custom config: cityArmyBuffer', () => {
    it('should return false when city is affordable with default buffer but not with larger buffer', () => {
      const strategy = new CaptureStrategy({ cityArmyBuffer: 20 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Top army has 25; city has 10 armies — 25 > 10 + 20 is false
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 10
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(false)
    })

    it('should return true when city clears the larger buffer', () => {
      const strategy = new CaptureStrategy({ cityArmyBuffer: 5 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Top army has 25; city has 5 armies — 25 > 5 + 5 = 10 ✓
      game.cities = [24]
      game.knownCities = [24]
      game.armies[24] = 5
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.EXPAND)).toBe(true)
    })

    it('should only include cities that meet the buffer in generateMoves', () => {
      const strategy = new CaptureStrategy({ cityArmyBuffer: 10 })
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Top army has 25; affordable city at 24 (armies=10), too-expensive at 20 (armies=20)
      // 25 > 10+10=20 ✓  but  25 > 20+10=30 ✗
      game.cities = [20, 24]
      game.knownCities = [20, 24]
      game.armies[24] = 10
      game.armies[20] = 20
      game.terrain[24] = -1
      game.terrain[20] = -1
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // Should generate moves toward city 24 (the affordable one), not 20
      expect(moves.length).toBeGreaterThan(0)
      expect(moves[moves.length - 1].targetIndex).toBe(24)
    })
  })
})
