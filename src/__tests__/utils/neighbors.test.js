import { findNeighbors } from '../../utils/neighbors'
import { initializeGameState } from '../../testUtils/testHelper'

describe('findNeighbors', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('should return 2 neighbors for a corner tile', () => {
    const corner = game.locationObjectMap[0][0] // index 0
    const neighbors = findNeighbors({location: corner, game})
    expect(neighbors.length).toBe(2) // right and below
  })

  it('should return 4 neighbors for a center tile', () => {
    const center = game.locationObjectMap[2][2] // index 12
    const neighbors = findNeighbors({location: center, game})
    expect(neighbors.length).toBe(4)
  })

  it('should return 3 neighbors for an edge tile', () => {
    const edge = game.locationObjectMap[0][2] // index 2, top row middle
    const neighbors = findNeighbors({location: edge, game})
    expect(neighbors.length).toBe(3)
  })

  it('should accept a raw index instead of location object', () => {
    const neighbors = findNeighbors({location: 12, game}) // center index
    expect(neighbors.length).toBe(4)
  })

  it('should throw without game context', () => {
    expect(() => findNeighbors({location: 0, game: null})).toThrow()
  })
})
