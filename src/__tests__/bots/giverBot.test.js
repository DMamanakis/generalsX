import giverBot from '../../bots/giverBot'
import { BotFramework } from '../../bots/botFramework'
import { DefendStrategy } from '../../strategies/DefendStrategy'
import { ReinforceTeammateStrategy } from '../../strategies/ReinforceTeammateStrategy'
import { CaptureForTeammateStrategy } from '../../strategies/CaptureForTeammateStrategy'
import { ExpandStrategy } from '../../strategies/ExpandStrategy'
import { ExploreStrategy } from '../../strategies/ExploreStrategy'
import { initializeGameState } from '../../testUtils/testHelper'

describe('giverBot', () => {
  let game

  beforeEach(() => {
    game = initializeGameState('empty', 'allArmiesOnGeneral')
  })

  it('initializes a BotFramework without throwing', () => {
    expect(() => giverBot.init(game)).not.toThrow()
    expect(giverBot._framework).toBeInstanceOf(BotFramework)
  })

  it('builds strategies in Defend > ReinforceTeammate > CaptureForTeammate > Expand > Explore order', () => {
    giverBot.init(game)
    const strategies = giverBot._framework.strategies
    expect(strategies.length).toBe(5)
    expect(strategies[0]).toBeInstanceOf(DefendStrategy)
    expect(strategies[1]).toBeInstanceOf(ReinforceTeammateStrategy)
    expect(strategies[2]).toBeInstanceOf(CaptureForTeammateStrategy)
    expect(strategies[3]).toBeInstanceOf(ExpandStrategy)
    expect(strategies[4]).toBeInstanceOf(ExploreStrategy)
  })

  it('configures ReinforceTeammateStrategy with minArmyToShare: 6', () => {
    giverBot.init(game)
    expect(giverBot._framework.strategies[1].config.minArmyToShare).toBe(6)
  })

  it('configures CaptureForTeammateStrategy with minArmyToCapture: 3', () => {
    giverBot.init(game)
    expect(giverBot._framework.strategies[2].config.minArmyToCapture).toBe(3)
  })

  it('configures ExpandStrategy with minArmySize: 3', () => {
    giverBot.init(game)
    expect(giverBot._framework.strategies[3].config.minArmySize).toBe(3)
  })

  it('move() does nothing before the opening threshold', () => {
    giverBot.init(game)
    game.turn = 10
    giverBot.move()
    expect(game.socket.emit).not.toHaveBeenCalled()
  })

  it('move() delegates to the framework and drives a turn (falls through to Expand/Explore in FFA)', () => {
    giverBot.init(game)
    game.turn = 30
    giverBot.move()
    expect(game.socket.emit).toHaveBeenCalledWith('attack', expect.any(Number), expect.any(Number), expect.any(Boolean))
  })
})
