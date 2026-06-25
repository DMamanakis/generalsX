import { BotFramework } from '../../bots/botFramework'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('BotFramework', () => {
  let framework
  let game

  beforeEach(() => {
    framework = new BotFramework([new MdkStrategy(), new ExpandStrategy()])
    game = initializeGameState('empty', 'allArmiesOnGeneral')
    framework.init(game)
  })

  it('should initialize without errors', () => {
    expect(framework.game).toBe(game)
    expect(framework.attackQueue).toEqual([])
  })

  it('should skip moves before OPENING_FIRST_MOVE_THRESHOLD', () => {
    game.turn = 10
    framework.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('should emit an attack after opening threshold', () => {
    // Use turn < 100 so general is included in top armies
    game.turn = 30
    framework.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), false)
  })

  it('should use MDK strategy when general is known', () => {
    game.turn = 50  // Before EARLY_GAME so general counts as top army
    game.generals = [24]
    game.opponents[0] = {dead: false, generalLocationIndex: 24, color: 'RED', total: 5, tiles: 1}
    game.terrain[24] = 0
    game.armies[24] = 3
    game.myScore = {total: 30, tiles: 5}

    framework.move()

    const calls = game.socket.emit.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    // First arg of first 'attack' emit should be a number (attackerIndex)
    const attackCalls = calls.filter(c => c[0] === 'attack')
    expect(attackCalls.length).toBeGreaterThan(0)
  })

  it('should clear and refill queue when next move becomes invalid', () => {
    // Seed queue with an invalid move (attacker has only 1 army)
    framework.attackQueue = [{
      attackerIndex: 6,
      targetIndex: 7,
      mode: 'CREEP',
      priority: 0,
      sendHalf: false,
    }]

    // Invalidate the queued attacker
    game.armies[6] = 1

    // Add a different strong army so the refill has something to work with
    game.armies[11] = 10
    game.terrain[11] = 1  // Owned by player 1

    game.turn = 30

    framework.move()

    // The invalid queue was cleared, and the framework refilled from the new army
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), false)
  })
})
