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
 *   - CaptureStrategy cityArmyBuffer:2 — a bit more selective about cities than the
 *     default (1), but not so conservative that it never clears typical 40-50 garrisons
 */
const middleBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new MdkStrategy(),
      new CaptureStrategy({ cityArmyBuffer: 2 }),
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
