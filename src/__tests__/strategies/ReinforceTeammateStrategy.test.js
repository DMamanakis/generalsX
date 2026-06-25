import { ReinforceTeammateStrategy } from '../../strategies/ReinforceTeammateStrategy'
import { gatherIntel } from '../../intel/intelGathering'
import { initializeGameState } from '../../testUtils/testHelper'
import { buildGameMap } from '../../core/gameMap'

/**
 * 5×5 team game:
 *   row0:  1  1 -1 -1 -1
 *   row1:  1  1  1 -1 -1
 *   row2: -1  1 -1  2  2
 *   row3: -1 -1 -1  2  2
 *   row4: -1 -1 -1  2  2
 *
 * Player 1 (me): general at idx 6, large army at idx 0
 * Player 2 (teammate): general at idx 23
 */
function makeTeamGame({ teammateTotal = 5, myArmies = 15 } = {}) {
  const game = initializeGameState('occupiedCorner', 'cornerArmies')
  game.team = 1
  game.teams = [0, 1, 1, 0]
  game.opponents = [
    { color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9 },
    undefined,
    { color: 'BLUE', dead: false, tiles: 5, total: teammateTotal, availableArmies: teammateTotal - 1, generalLocationIndex: 23 },
  ]

  game.terrain[13] = 2
  game.terrain[14] = 2
  game.terrain[18] = 2
  game.terrain[19] = 2
  game.terrain[23] = 2

  // Set all my tiles to myArmies so myTopArmies[0].armies reflects the param
  ;[0, 1, 5, 6, 7, 11].forEach(i => { game.armies[i] = myArmies })
  game.armies[13] = 3
  game.armies[14] = 3
  game.armies[18] = 3
  game.armies[19] = 3
  game.armies[23] = 8

  buildGameMap(game)
  return game
}

describe('ReinforceTeammateStrategy', () => {
  describe('default config', () => {
    let strategy

    beforeEach(() => {
      strategy = new ReinforceTeammateStrategy()
    })

    it('defaults to minArmyToShare: 8', () => {
      expect(strategy.config.minArmyToShare).toBe(8)
    })

    it('returns false in FFA (no teams)', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('returns false when top army is below minArmyToShare', () => {
      const game = makeTeamGame({ myArmies: 4 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('returns true when army meets minArmyToShare and teammate exists', () => {
      const game = makeTeamGame({ myArmies: 15 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(true)
    })

    it('returns true regardless of foreign policy', () => {
      const game = makeTeamGame({ myArmies: 15 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'DEFEND')).toBe(true)
      expect(strategy.evaluate(game, intel, 'MURDER')).toBe(true)
    })

    it('returns false when teammate is dead', () => {
      const game = makeTeamGame()
      game.opponents[2].dead = true
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })
  })

  describe('generateMoves', () => {
    it('generates REINFORCE moves toward teammate general', () => {
      const strategy = new ReinforceTeammateStrategy()
      const game = makeTeamGame({ myArmies: 15 })
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('REINFORCE'))
    })

    it('path starts from our largest army', () => {
      const strategy = new ReinforceTeammateStrategy()
      const game = makeTeamGame({ myArmies: 15 })
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // moves[0] = first step out from our source army (idx 0)
      expect(moves[0].attackerIndex).toBe(0)
    })

    it('returns empty array in FFA', () => {
      const strategy = new ReinforceTeammateStrategy()
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('falls back to nearest teammate tile when general is unknown', () => {
      const strategy = new ReinforceTeammateStrategy()
      const game = makeTeamGame({ myArmies: 15 })
      game.opponents[2].generalLocationIndex = -1  // general not visible
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // Should still generate moves (toward nearest teammate tile)
      expect(moves.length).toBeGreaterThan(0)
    })

    it('returns empty when no teammate tiles visible and general unknown', () => {
      const strategy = new ReinforceTeammateStrategy()
      const game = makeTeamGame({ myArmies: 15 })
      game.opponents[2].generalLocationIndex = -1
      // Remove all teammate terrain tiles
      ;[13, 14, 18, 19, 23].forEach(i => { game.terrain[i] = -1 })
      buildGameMap(game)
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })

  describe('custom config', () => {
    it('minArmyToShare: 20 — does not fire with 15 armies', () => {
      const strategy = new ReinforceTeammateStrategy({ minArmyToShare: 20 })
      const game = makeTeamGame({ myArmies: 15 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('minArmyToShare: 5 — fires with 8 armies', () => {
      const strategy = new ReinforceTeammateStrategy({ minArmyToShare: 5 })
      const game = makeTeamGame({ myArmies: 8 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(true)
    })
  })
})
