import { BotFramework } from './botFramework'
import { MurderStrategy } from '../strategies/MurderStrategy'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'

/**
 * EnigmaBot preset: stealth-oriented with defensive awareness.
 * Strategies (priority order): Defend > Murder > Capture > Expand > Explore
 */
const enigmaBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new MurderStrategy(),
      new CaptureStrategy(),
      new ExpandStrategy(),
      new ExploreStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default enigmaBot
