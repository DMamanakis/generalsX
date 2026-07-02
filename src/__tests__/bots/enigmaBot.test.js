import enigmaBot from '../../bots/enigmaBot'
import { BotFramework } from '../../bots/botFramework'
import { DefendStrategy } from '../../strategies/DefendStrategy'
import { MdkStrategy } from '../../strategies/MdkStrategy'
import { CaptureStrategy } from '../../strategies/CaptureStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('enigmaBot', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('initializes a BotFramework without throwing', () => {
    expect(() => enigmaBot.init(game)).not.toThrow()
    expect(enigmaBot._framework).toBeInstanceOf(BotFramework)
  })

  it('builds strategies in Defend > Mdk > Capture > Expand > Explore order', () => {
    enigmaBot.init(game)
    const strategies = enigmaBot._framework.strategies
    expect(strategies.length).toBe(5)
    expect(strategies[0]).toBeInstanceOf(DefendStrategy)
    expect(strategies[1]).toBeInstanceOf(MdkStrategy)
    expect(strategies[2]).toBeInstanceOf(CaptureStrategy)
    expect(strategies[3]).toBeInstanceOf(ExpandStrategy)
    expect(strategies[4]).toBeInstanceOf(ExploreStrategy)
  })

  it('configures CaptureStrategy with cityArmyBuffer: 3', () => {
    enigmaBot.init(game)
    const captureStrategy = enigmaBot._framework.strategies[2]
    expect(captureStrategy.config.cityArmyBuffer).toBe(3)
  })

  it('move() does nothing before the opening threshold', () => {
    enigmaBot.init(game)
    game.turn = 10
    enigmaBot.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('move() delegates to the framework and drives a turn', () => {
    enigmaBot.init(game)
    game.turn = 30
    enigmaBot.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), expect.any(Boolean))
  })
})
