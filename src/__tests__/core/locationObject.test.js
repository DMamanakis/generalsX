import { makeLocationObject, getLocationObject } from '../../core/locationObject'
import { initializeGameState } from '../../testUtils/testHelper'

describe('makeLocationObject', () => {
  it('should build a location object with derived flags for an owned tile', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const loc = makeLocationObject(6, game) // our general tile

    expect(loc.idx).toBe(6)
    expect(loc.armies).toBe(game.armies[6])
    expect(loc.terrain).toBe(game.playerIndex)
    expect(loc.isMine).toBe(true)
    expect(loc.isTeam).toBe(false)
  })

  it('should mark isTeam true for a teammate tile that is not our own', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.team = 1
    game.teams = [1, 1] // player 0 (terrain owner at idx 24) is our teammate
    const loc = makeLocationObject(24, game)

    expect(loc.isTeam).toBe(true)
    expect(loc.isMine).toBe(false)
  })

  it('should mark isGeneral true when a living opponent general occupies the tile', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    game.opponents[0] = {color: 'RED', dead: false, tiles: 1, total: 10, generalLocationIndex: 24}
    const loc = makeLocationObject(24, game)

    expect(loc.isGeneral).toBe(true)
  })
})

describe('getLocationObject', () => {
  it('should throw without game context', () => {
    expect(() => getLocationObject({locationIdx: 0, game: null})).toThrow(
      'getLocationObject requires game context'
    )
  })

  it('should look up the correct location object from locationObjectMap', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const loc = getLocationObject({locationIdx: 6, game})

    expect(loc).toBe(game.locationObjectMap[1][1])
    expect(loc.idx).toBe(6)
  })
})
