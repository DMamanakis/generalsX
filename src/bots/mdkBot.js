import { BotFramework } from './botFramework'
import { MdkStrategy } from '../strategies/MdkStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'

/**
 * MdkBot preset: aggressive early expansion, hunts enemy generals.
 * Strategies (priority order): Mdk > Capture > Expand > Explore
 */
const mdkBot = {
  init(game) {
    this._framework = new BotFramework([
      new MdkStrategy(),
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

export default mdkBot
