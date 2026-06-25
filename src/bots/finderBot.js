import { BotFramework } from './botFramework'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { MdkStrategy } from '../strategies/MdkStrategy'

/**
 * FinderBot preset: exploration-focused, prioritizes discovering the map.
 * Strategies (priority order): Explore > Expand > Mdk
 */
const finderBot = {
  init(game) {
    this._framework = new BotFramework([
      new ExploreStrategy(),
      new ExpandStrategy(),
      new MdkStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default finderBot
