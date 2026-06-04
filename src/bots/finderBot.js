import { BotFramework } from './botFramework'
import { ExploreStrategy } from '../strategies/ExploreStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { MurderStrategy } from '../strategies/MurderStrategy'

/**
 * FinderBot preset: exploration-focused, prioritizes discovering the map.
 * Strategies (priority order): Explore > Expand > Murder
 */
const finderBot = {
  init(game) {
    this._framework = new BotFramework([
      new ExploreStrategy(),
      new ExpandStrategy(),
      new MurderStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default finderBot
