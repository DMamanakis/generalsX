import { getTeammateInfo, getEmptyTilesAdjacentToTeammate } from '../../intel/teamIntel'
import { initializeGameState } from '../../testUtils/testHelper'
import { buildGameMap } from '../../core/gameMap'

/**
 * Build a 5×5 team game state.
 * Player 1 (me): tiles 0,1,5,6,7,11 — general at idx 6
 * Player 2 (teammate): tiles 13,14,18,19,23 — general at idx 23
 * Empty border between the two: idx 2,3,4,8,9,12,17,22 etc.
 *
 *   idx layout (5×5):
 *   row0:  0  1  2  3  4
 *   row1:  5  6  7  8  9
 *   row2: 10 11 12 13 14
 *   row3: 15 16 17 18 19
 *   row4: 20 21 22 23 24
 */
function makeTeamGame() {
  const game = initializeGameState('occupiedCorner', 'cornerArmies')
  // occupiedCorner: player 1 tiles at 0,1,5,6,7,11 — cornerArmies: all = 5

  game.team = 1
  game.teams = [0, 1, 1, 0]  // players 1 & 2 are teammates on team 1

  game.opponents = [
    { color: 'RED', dead: false, tiles: 1, total: 10, availableArmies: 9 },
    undefined, // self (slot 1)
    { color: 'BLUE', dead: false, tiles: 5, total: 20, availableArmies: 15, generalLocationIndex: 23 },
    { color: 'GREEN', dead: false, tiles: 3, total: 15, availableArmies: 12 },
  ]

  // Teammate tiles (player 2)
  game.terrain[13] = 2
  game.terrain[14] = 2
  game.terrain[18] = 2
  game.terrain[19] = 2
  game.terrain[23] = 2

  game.armies[13] = 3
  game.armies[14] = 3
  game.armies[18] = 3
  game.armies[19] = 3
  game.armies[23] = 8

  buildGameMap(game)
  return game
}

describe('getTeammateInfo', () => {
  it('returns null in FFA (game.teams is null)', () => {
    const game = initializeGameState('occupiedCorner', 'cornerArmies')
    expect(getTeammateInfo(game)).toBeNull()
  })

  it('returns null when game.team is null', () => {
    const game = initializeGameState('occupiedCorner', 'cornerArmies')
    game.teams = [0, 1, 1]
    // game.team is null (default)
    expect(getTeammateInfo(game)).toBeNull()
  })

  it('returns null when no living teammate exists', () => {
    const game = initializeGameState('occupiedCorner', 'cornerArmies')
    game.team = 1
    game.teams = [0, 1, 1]
    game.opponents[2] = { color: 'BLUE', dead: true, tiles: 0, total: 0 }
    expect(getTeammateInfo(game)).toBeNull()
  })

  it('returns teammate info with generalLocationIndex when visible', () => {
    const game = makeTeamGame()
    const info = getTeammateInfo(game)
    expect(info).not.toBeNull()
    expect(info.playerIndex).toBe(2)
    expect(info.generalLocationIndex).toBe(23)
    expect(info.total).toBe(20)
    expect(info.tiles).toBe(5)
  })

  it('returns generalLocationIndex null when general is not yet visible (-1)', () => {
    const game = makeTeamGame()
    game.opponents[2].generalLocationIndex = -1
    const info = getTeammateInfo(game)
    expect(info.generalLocationIndex).toBeNull()
  })

  it('returns generalLocationIndex null when generalLocationIndex is undefined', () => {
    const game = makeTeamGame()
    delete game.opponents[2].generalLocationIndex
    const info = getTeammateInfo(game)
    expect(info.generalLocationIndex).toBeNull()
  })

  it('skips self (playerIndex === game.playerIndex)', () => {
    const game = makeTeamGame()
    // self is playerIndex=1, which is undefined in opponents — filtered by !opp guard
    // Just verify the result isn't "self"
    const info = getTeammateInfo(game)
    expect(info.playerIndex).not.toBe(game.playerIndex)
  })

  it('defaults total and tiles to 0 when the teammate object omits them', () => {
    const game = makeTeamGame()
    game.opponents[2] = {color: 'BLUE', dead: false}
    const info = getTeammateInfo(game)
    expect(info).not.toBeNull()
    expect(info.total).toBe(0)
    expect(info.tiles).toBe(0)
  })

  it('skips entries that are -1 (sentinel)', () => {
    const game = makeTeamGame()
    game.opponents[2] = -1
    // No valid teammate left
    expect(getTeammateInfo(game)).toBeNull()
  })
})

describe('getEmptyTilesAdjacentToTeammate', () => {
  it('returns empty array in FFA (no teams)', () => {
    const game = initializeGameState('occupiedCorner', 'cornerArmies')
    expect(getEmptyTilesAdjacentToTeammate(game)).toEqual([])
  })

  it('returns empty tiles that border at least one teammate tile', () => {
    const game = makeTeamGame()
    const empties = getEmptyTilesAdjacentToTeammate(game)
    expect(empties.length).toBeGreaterThan(0)
    // All returned tiles must have terrain === -1 (TERRAIN_EMPTY)
    empties.forEach(t => expect(t.terrain).toBe(-1))
  })

  it('does not return teammate tiles themselves', () => {
    const game = makeTeamGame()
    const empties = getEmptyTilesAdjacentToTeammate(game)
    // Teammate tiles are indices 13,14,18,19,23 — none should appear
    const teammateTileIndices = [13, 14, 18, 19, 23]
    empties.forEach(t => expect(teammateTileIndices).not.toContain(t.idx))
  })

  it('does not return our own tiles', () => {
    const game = makeTeamGame()
    const empties = getEmptyTilesAdjacentToTeammate(game)
    // Our tiles: 0,1,5,6,7,11
    const myTileIndices = [0, 1, 5, 6, 7, 11]
    empties.forEach(t => expect(myTileIndices).not.toContain(t.idx))
  })

  it('returns each empty tile at most once (no duplicates)', () => {
    const game = makeTeamGame()
    const empties = getEmptyTilesAdjacentToTeammate(game)
    const idxSet = new Set(empties.map(t => t.idx))
    expect(idxSet.size).toBe(empties.length)
  })
})
