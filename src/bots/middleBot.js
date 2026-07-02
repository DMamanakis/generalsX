import { BotFramework } from './botFramework'
import { MdkStrategy } from '../strategies/MdkStrategy'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'

/**
 * MiddleBot preset: stealth-oriented with defensive awareness.
 * Strategies (priority order): Defend > Mdk > Capture > Expand > Explore
 *
 * Config choices:
 *   - CaptureStrategy cityArmyBuffer:3 — selective about cities, only takes clearly affordable ones
 */
const middleBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new MdkStrategy(),
      new CaptureStrategy({ cityArmyBuffer: 3 }),
      new ExpandStrategy(),
      new ExploreStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default middleBot
