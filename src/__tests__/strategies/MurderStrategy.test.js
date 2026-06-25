import { MurderStrategy } from '../../strategies/MurderStrategy'
import { FOREIGN_POLICY } from '../../intel/foreignPolicy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'

describe('MurderStrategy', () => {
  let strategy

  beforeEach(() => {
    strategy = new MurderStrategy()
  })

  describe('evaluate()', () => {
    it('should return false with no known generals', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = []
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MURDER)).toBe(false)
    })

    it('should return true when enemy general is known and policy is MURDER', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MURDER)).toBe(true)
    })

    it('should return false when policy is DEFEND (we are outmatched)', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.DEFEND)).toBe(false)
    })

    it('should return false for a teammate general even when policy is MURDER', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      // Player 0 is on our team
      game.teams = [1, 1]  // both player 0 and player 1 are on team 1
      game.team = 1
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, FOREIGN_POLICY.MURDER)).toBe(false)
    })
  })

  describe('generateMoves()', () => {
    it('should return MURDER moves targeting enemy general', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24, color: 'RED', tiles: 1, total: 10}
      game.terrain[24] = 0
      game.armies[24] = 5

      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)

      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('MURDER'))

      const lastMove = moves[moves.length - 1]
      expect(lastMove.targetIndex).toBe(24)
    })

    it('should skip a teammate general and return no moves', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      game.teams = [1, 1]
      game.team = 1

      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves).toEqual([])
    })

    it('should return empty array when no top armies available', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      const intel = gatherIntel(game)
      intel.myTopArmies = []
      const moves = strategy.generateMoves(game, intel)
      expect(moves).toEqual([])
    })
  })
})
