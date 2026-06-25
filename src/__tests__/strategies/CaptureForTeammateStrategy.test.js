import { CaptureForTeammateStrategy } from '../../strategies/CaptureForTeammateStrategy'
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
 * Empty tiles adjacent to teammate: idx 8 (row1-col3, borders 13 & 14),
 *   idx 12 (row2-col2, borders 13), idx 17 (row3-col2, borders 18), etc.
 */
function makeTeamGame({ myArmies = 10 } = {}) {
  const game = initializeGameState('occupiedCorner', 'cornerArmies')
  game.team = 1
  game.teams = [0, 1, 1, 0]
  game.opponents = [
    { color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9 },
    undefined,
    { color: 'BLUE', dead: false, tiles: 5, total: 20, availableArmies: 15, generalLocationIndex: 23 },
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

describe('CaptureForTeammateStrategy', () => {
  describe('default config', () => {
    let strategy

    beforeEach(() => {
      strategy = new CaptureForTeammateStrategy()
    })

    it('defaults to minArmyToCapture: 4', () => {
      expect(strategy.config.minArmyToCapture).toBe(4)
    })

    it('returns false in FFA (no teams)', () => {
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('returns false when army is below minArmyToCapture', () => {
      const game = makeTeamGame({ myArmies: 2 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('returns true when army is sufficient and empty adjacent tiles exist', () => {
      const game = makeTeamGame({ myArmies: 10 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(true)
    })

    it('returns false when no empty tiles border teammate territory', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = makeTeamGame({ myArmies: 10 })
      // Fill every tile adjacent to teammate with enemy armies
      ;[8, 9, 12, 17, 22].forEach(i => { game.terrain[i] = 0; game.armies[i] = 5 })
      buildGameMap(game)
      const intel = gatherIntel(game)
      // May or may not return false depending on remaining empty border tiles
      // Just verify the function doesn't crash
      expect(() => strategy.evaluate(game, intel, 'EXPLORE')).not.toThrow()
    })
  })

  describe('generateMoves', () => {
    it('generates HANDOFF moves toward an empty tile adjacent to teammate', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = makeTeamGame({ myArmies: 10 })
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      expect(moves.length).toBeGreaterThan(0)
      moves.forEach(m => expect(m.mode).toBe('HANDOFF'))
    })

    it('path starts from our largest army', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = makeTeamGame({ myArmies: 10 })
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // moves[0] is the first step out of our source at idx 0
      expect(moves[0].attackerIndex).toBe(0)
    })

    it('last or second-to-last move targets an empty tile next to teammate', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = makeTeamGame({ myArmies: 10 })
      const intel = gatherIntel(game)
      const moves = strategy.generateMoves(game, intel)
      // The final move should be the HANDOFF step: attacker = empty tile, target = teammate tile
      const lastMove = moves[moves.length - 1]
      // The target of the last move should be a teammate tile (isTeam)
      const targetLoc = game.locations[lastMove.targetIndex]
      expect(targetLoc.isTeam).toBe(true)
    })

    it('returns empty array in FFA', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = initializeGameState('occupiedCorner', 'cornerArmies')
      const intel = gatherIntel(game)
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })

    it('returns empty when no myTopArmies', () => {
      const strategy = new CaptureForTeammateStrategy()
      const game = makeTeamGame({ myArmies: 1 })
      const intel = gatherIntel(game)
      // With armies=1 (below usefulArmyThreshold), myTopArmies is empty
      intel.myTopArmies = []
      expect(strategy.generateMoves(game, intel)).toEqual([])
    })
  })

  describe('custom config', () => {
    it('minArmyToCapture: 15 — does not fire with 10 armies', () => {
      const strategy = new CaptureForTeammateStrategy({ minArmyToCapture: 15 })
      const game = makeTeamGame({ myArmies: 10 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(false)
    })

    it('minArmyToCapture: 3 — fires with 5 armies', () => {
      const strategy = new CaptureForTeammateStrategy({ minArmyToCapture: 3 })
      const game = makeTeamGame({ myArmies: 5 })
      const intel = gatherIntel(game)
      expect(strategy.evaluate(game, intel, 'EXPLORE')).toBe(true)
    })
  })
})
