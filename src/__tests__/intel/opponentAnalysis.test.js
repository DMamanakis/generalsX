import { rankOpponents, getMostVulnerableOpponent, getOpponentWithKnownGeneral } from '../../intel/opponentAnalysis'
import { initializeGameState } from '../../testUtils/testHelper'

describe('opponentAnalysis', () => {
  describe('rankOpponents()', () => {
    it('should return empty array when no opponents', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents = []
      expect(rankOpponents(game)).toEqual([])
    })

    it('should exclude dead opponents', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: true, total: 5, tiles: 1}
      expect(rankOpponents(game)).toEqual([])
    })

    it('should preserve the correct playerIndex after filtering dead opponents', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      // Player 0 is dead, player 2 is alive
      game.opponents[0] = -1
      game.opponents[1] = null
      game.opponents[2] = {dead: false, total: 30, tiles: 3}
      const ranked = rankOpponents(game)
      expect(ranked).toHaveLength(1)
      expect(ranked[0].playerIndex).toBe(2)  // must be 2, not 0
    })

    it('should sort by total armies ascending (weakest first)', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 100, tiles: 10}
      game.opponents[2] = {dead: false, total: 20, tiles: 2}
      const ranked = rankOpponents(game)
      expect(ranked[0].total).toBe(20)
      expect(ranked[1].total).toBe(100)
    })

    it('should exclude teammates', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 10, tiles: 1}
      game.teams = [1, 1]  // player 0 and player 1 (us) are teammates
      game.team = 1
      expect(rankOpponents(game)).toEqual([])
    })

    it('should compute hasKnownGeneral correctly', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 10, tiles: 1, generalLocationIndex: 24}
      game.opponents[2] = {dead: false, total: 5, tiles: 1}  // no generalLocationIndex
      const ranked = rankOpponents(game)
      const withGeneral = ranked.find(o => o.playerIndex === 0)
      const withoutGeneral = ranked.find(o => o.playerIndex === 2)
      expect(withGeneral.hasKnownGeneral).toBe(true)
      expect(withoutGeneral.hasKnownGeneral).toBe(false)
    })
  })

  describe('getMostVulnerableOpponent()', () => {
    it('should return null when no opponents', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents = []
      expect(getMostVulnerableOpponent(game)).toBeNull()
    })

    it('should return the opponent with fewest total armies', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 100, tiles: 10}
      game.opponents[2] = {dead: false, total: 5, tiles: 1}
      expect(getMostVulnerableOpponent(game).playerIndex).toBe(2)
    })
  })

  describe('getOpponentWithKnownGeneral()', () => {
    it('should return null when no opponents have known generals', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 10, tiles: 1}  // no generalLocationIndex
      expect(getOpponentWithKnownGeneral(game)).toBeNull()
    })

    it('should return the weakest opponent with a known general', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 100, tiles: 10, generalLocationIndex: 24}
      game.opponents[2] = {dead: false, total: 5, tiles: 1, generalLocationIndex: 20}
      const target = getOpponentWithKnownGeneral(game)
      expect(target.playerIndex).toBe(2)  // weakest with known general
      expect(target.generalLocationIndex).toBe(20)
    })

    it('should skip opponents without a known general', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 5, tiles: 1}  // weakest but no general
      game.opponents[2] = {dead: false, total: 50, tiles: 5, generalLocationIndex: 20}
      const target = getOpponentWithKnownGeneral(game)
      expect(target.playerIndex).toBe(2)  // only one with known general
    })

    it('should return null when only known general is a teammate', () => {
      const game = initializeGameState('empty', 'allArmiesOnGeneral')
      game.opponents[0] = {dead: false, total: 10, tiles: 1, generalLocationIndex: 24}
      game.teams = [1, 1]
      game.team = 1
      expect(getOpponentWithKnownGeneral(game)).toBeNull()
    })
  })
})
