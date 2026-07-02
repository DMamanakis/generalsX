import { getArmyAttackDiff, canCapture, pathStrength } from '../../utils/combat'
import { initializeGameState } from '../../testUtils/testHelper'

describe('getArmyAttackDiff', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('should return positive diff when attacker is stronger', () => {
    const attacker = {armies: 10, terrain: 1}
    const target = {armies: 5, terrain: -1}
    const diff = getArmyAttackDiff(attacker, target, game)
    expect(diff).toBe(4) // 10 - 5 - 1
  })

  it('should return negative diff when target is stronger', () => {
    const attacker = {armies: 3, terrain: 1}
    const target = {armies: 10, terrain: -1}
    const diff = getArmyAttackDiff(attacker, target, game)
    expect(diff).toBe(-8) // 3 - 10 - 1
  })

  it('should calculate friendly merge (same terrain)', () => {
    const attacker = {armies: 5, terrain: 1}
    const target = {armies: 3, terrain: 1}
    const diff = getArmyAttackDiff(attacker, target, game)
    expect(diff).toBe(7) // 5 + (3-1)
  })

  it('should throw without game context', () => {
    expect(() => getArmyAttackDiff({}, {}, null)).toThrow()
  })
})

describe('canCapture', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('should return true when attacker can win', () => {
    const attacker = {armies: 10, terrain: 1}
    const target = {armies: 3, terrain: -1}
    expect(canCapture(attacker, target, game)).toBe(true)
  })

  it('should return false when attacker cannot win', () => {
    const attacker = {armies: 3, terrain: 1}
    const target = {armies: 5, terrain: -1}
    expect(canCapture(attacker, target, game)).toBe(false)
  })
})

describe('pathStrength', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('should return 0 for empty path', () => {
    expect(pathStrength([], game)).toBe(0)
  })

  it('should return army count of single tile', () => {
    game = initializeGameState('empty', 'twoLargeArmies') // armies[6] = 15
    const source = game.locationObjectMap[1][1]
    expect(pathStrength([source], game)).toBe(15)
  })

  it('should reduce strength while traversing a multi-tile path', () => {
    const path = [
      {armies: 5, terrain: -1}, // final target (path[0])
      {armies: 20, terrain: 1}, // source tile (last element)
    ]
    // strength starts at path[1].armies = 20, then combines with path[0]
    // via getArmyAttackDiff({armies: 20, terrain: game.playerIndex}, path[0], game)
    // = 20 - 5 - 1 = 14
    expect(pathStrength(path, game)).toBe(14)
  })
})
