import { createDarknessMap } from '../../utils/darknessMap'
import { initializeGameState } from '../../testUtils/testHelper'

describe('createDarknessMap', () => {
  it('throws when called without game context', () => {
    expect(() => createDarknessMap(null)).toThrow('createDarknessMap requires game context')
  })

  it('assigns darkness=0 to owned and empty visible tiles', () => {
    const game = initializeGameState('empty', 'allArmiesOnGeneral')
    const darknessMap = createDarknessMap(game)

    // idx 6 is owned by playerIndex 1 — visible, must be seeded
    expect(darknessMap[6]).toBe(0)
    // idx 0 is TERRAIN_EMPTY (-1) — visible, must be seeded
    expect(darknessMap[0]).toBe(0)
  })

  it('does NOT seed mountains (terrain=-2) as visible — they get darkness > 0', () => {
    // mountainous terrain has mountains at idx 8, 12, 19, 22
    const game = initializeGameState('mountainous', 'allArmiesOnGeneral')
    const darknessMap = createDarknessMap(game)

    // Each mountain index must NOT be seeded; BFS from visible neighbours gives darkness >= 1
    expect(darknessMap[8]).toBeGreaterThan(0)
    expect(darknessMap[12]).toBeGreaterThan(0)
    expect(darknessMap[19]).toBeGreaterThan(0)
    expect(darknessMap[22]).toBeGreaterThan(0)
  })

  it('assigns darkness > 0 to fog tiles', () => {
    // foggy terrain has TERRAIN_FOG (-3) at idx 18, 19, 23, 24
    const game = initializeGameState('foggy', 'allArmiesOnGeneral')
    const darknessMap = createDarknessMap(game)

    expect(darknessMap[18]).toBeGreaterThan(0)
    expect(darknessMap[19]).toBeGreaterThan(0)
    expect(darknessMap[23]).toBeGreaterThan(0)
    expect(darknessMap[24]).toBeGreaterThan(0)
  })

  it('assigns increasing darkness further from visible territory', () => {
    // foggy terrain: rows 0-2 are all visible (empty/owned), rows 3-4 corner is fog
    // idx 18,19 (row 3, col 3-4) and idx 23,24 (row 4, col 3-4) are TERRAIN_FOG (-3)
    // idx 24 (row 4, col 4) has only fog neighbours — it is the deepest dark tile
    const game = initializeGameState('foggy', 'allArmiesOnGeneral')
    const darknessMap = createDarknessMap(game)

    // idx 0 is visible (TERRAIN_EMPTY) → seeded at darkness=0
    expect(darknessMap[0]).toBe(0)
    // idx 18 is adjacent to a visible tile → darkness=1
    expect(darknessMap[18]).toBe(1)
    // idx 24 is one BFS step deeper than idx 18/19 → darkness=2
    expect(darknessMap[24]).toBe(2)
  })
})