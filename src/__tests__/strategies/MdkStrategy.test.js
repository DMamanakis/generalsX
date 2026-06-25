import { MdkStrategy } from '../../strategies/MdkStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('MdkStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new MdkStrategy()
  })

  describe('evaluate()', () => {
    it('should return false with no known generals', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = []
      game.opponents = []
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
    })

    it('should return true when enemy general is known and policy is MDK', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24, total: 10, tiles: 1}
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(true)
    })

    it('should return false when policy is DEFEND', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24, total: 10, tiles: 1}
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false when only general known is a teammate', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24, total: 10, tiles: 1}
      game.teams = [1, 1]
      game.team = 1
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MDK)).toBe(false)
    })

    it('should target the weakest opponent when multiple generals are known', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Two opponents: strong at index 0, weak at index 1
      game.opponents[0] = {dead: false, generalLocationIndex: 24, total: 100, tiles: 10}
      game.opponents[1] = {dead: false, generalLocationIndex: 20, total: 5, tiles: 1}
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // The path should end at index 20 (weakest opponent's general), not 24
      expect(moves.length).toBeGreaterThan(0)
      const lastMove = moves[moves.length - 1]
      expect(lastMove.targetIndex).toBe(20)
    })
  })

  describe('generateMoves()', () => {
    it('should return MDK moves targeting the weakest known enemy general', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24, total: 10, tiles: 1}
      game.terrain[24] = 0
      game.armies[24] = 5

      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)

      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('MDK'))
      expect(moves[moves.length - 1].targetIndex).toBe(24)
    })

    it('should skip a teammate general and return no moves', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      game.teams = [1, 1]
      game.team = 1
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('should return empty array when no top armies available', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })
})
