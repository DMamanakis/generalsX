import finderBot from '../../bots/finderBot'
import { BotFramework } from '../../bots/botFramework'
import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('finderBot', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('initializes a BotFramework without throwing', () => {
    expect(() => finderBot.init(game)).not.toThrow()
    expect(finderBot._framework).toBeInstanceOf(BotFramework)
  })

  it('builds strategies in Explore > Expand > Mdk order', () => {
    finderBot.init(game)
    const strategies = finderBot._framework.strategies
    expect(strategies.length).toBe(3)
    expect(strategies[0]).toBeInstanceOf(ExploreStrategy)
    expect(strategies[1]).toBeInstanceOf(ExpandStrategy)
    expect(strategies[2]).toBeInstanceOf(MdkStrategy)
  })

  it('move() does nothing before the opening threshold', () => {
    finderBot.init(game)
    game.turn = 10
    finderBot.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('move() delegates to the framework and drives a turn', () => {
    finderBot.init(game)
    game.turn = 30
    finderBot.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), expect.any(Boolean))
  })
})
