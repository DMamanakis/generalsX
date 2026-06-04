import { BotFramework } from './botFramework'
import { MurderStrategy } from '../strategies/MurderStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'

/**
 * MurderBot preset: aggressive early expansion, hunts enemy generals.
 * Strategies (priority order): Murder > Capture > Expand > Explore
 */
const murderBot = {
  init(game) {
    this._framework = new BotFramework([
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

export default murderBot
