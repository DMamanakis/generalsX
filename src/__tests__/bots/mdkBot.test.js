import mdkBot from '../../bots/mdkBot'
import { BotFramework } from '../../bots/botFramework'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { CaptureStrategy } from '../../strategies/CaptureStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('mdkBot', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('initializes a BotFramework without throwing', () => {
    expect(() => mdkBot.init(game)).not.toThrow()
    expect(mdkBot._framework).toBeInstanceOf(BotFramework)
  })

  it('builds strategies in Mdk > Capture > Expand > Explore order', () => {
    mdkBot.init(game)
    const strategies = mdkBot._framework.strategies
    expect(strategies.length).toBe(4)
    expect(strategies[0]).toBeInstanceOf(MdkStrategy)
    expect(strategies[1]).toBeInstanceOf(CaptureStrategy)
    expect(strategies[2]).toBeInstanceOf(ExpandStrategy)
    expect(strategies[3]).toBeInstanceOf(ExploreStrategy)
  })

  it('move() does nothing before the opening threshold', () => {
    mdkBot.init(game)
    game.turn = 10
    mdkBot.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('move() drives a turn when no enemy general is known yet', () => {
    mdkBot.init(game)
    game.turn = 30
    mdkBot.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), expect.any(Boolean))
  })

  it('move() hunts a known enemy general via MdkStrategy', () => {
    const withOpponentGame = initializeGameState('withOpponent', 'allArmiesOnGeneral')
    mdkBot.init(withOpponentGame)
    withOpponentGame.turn = 50 // before EARLY_GAME threshold so general counts as a top army
    withOpponentGame.generals = [24]
    withOpponentGame.opponents[0] = {dead: false, generalLocationIndex: 24, color: 'RED', total: 5, tiles: 1}
    withOpponentGame.terrain[24] = 0
    withOpponentGame.armies[24] = 3
    withOpponentGame.myScore = {total: 30, tiles: 5}

    mdkBot.move()

    const attackCalls = withOpponentGame.socket.emit.mock.calls.filter(c => c[0] === 'attack')
    expect(attackCalls.length).toBeGreaterThan(0)
  })
})
