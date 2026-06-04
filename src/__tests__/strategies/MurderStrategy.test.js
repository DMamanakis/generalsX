import { MurderStrategy } from '../../strategies/MurderStrategy'
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
      expect(strategy.evaluate(game, intel)).toBe(false)
    })

    it('should return true when enemy general is known', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.generals = [24]
      game.opponents[0] = {dead: false, generalLocationIndex: 24}
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel)).toBe(true)
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
