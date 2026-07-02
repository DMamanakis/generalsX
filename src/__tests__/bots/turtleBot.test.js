import turtleBot from '../../bots/turtleBot'
import { BotFramework } from '../../bots/botFramework'
import { DefendStrategy } from '../../strategies/DefendStrategy'
import { ConsolidateStrategy } from '../../strategies/ConsolidateStrategy'
import { CaptureStrategy } from '../../strategies/CaptureStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('turtleBot', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('initializes a BotFramework without throwing', () => {
    expect(() => turtleBot.init(game)).not.toThrow()
    expect(turtleBot._framework).toBeInstanceOf(BotFramework)
  })

  it('builds strategies in Defend > Consolidate > Capture > Expand > Mdk order', () => {
    turtleBot.init(game)
    const strategies = turtleBot._framework.strategies
    expect(strategies.length).toBe(5)
    expect(strategies[0]).toBeInstanceOf(DefendStrategy)
    expect(strategies[1]).toBeInstanceOf(ConsolidateStrategy)
    expect(strategies[2]).toBeInstanceOf(CaptureStrategy)
    expect(strategies[3]).toBeInstanceOf(ExpandStrategy)
    expect(strategies[4]).toBeInstanceOf(MdkStrategy)
  })

  it('configures CaptureStrategy with cityArmyBuffer: 5', () => {
    turtleBot.init(game)
    expect(turtleBot._framework.strategies[2].config.cityArmyBuffer).toBe(5)
  })

  it('configures ExpandStrategy with minArmySize: 8', () => {
    turtleBot.init(game)
    expect(turtleBot._framework.strategies[3].config.minArmySize).toBe(8)
  })

  it('move() does nothing before the opening threshold', () => {
    turtleBot.init(game)
    game.turn = 10
    turtleBot.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('move() delegates to the framework and drives a turn', () => {
    turtleBot.init(game)
    game.turn = 30
    turtleBot.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), expect.any(Boolean))
  })
})
