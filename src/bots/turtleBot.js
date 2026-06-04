import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { ConsolidateStrategy } from '../strategies/ConsolidateStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { MurderStrategy } from '../strategies/MurderStrategy'

/**
 * TurtleBot preset: defensive consolidation and fortification.
 * Strategies (priority order): Defend > Consolidate > Capture > Expand > Murder
 */
const turtleBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new ConsolidateStrategy(),
      new CaptureStrategy(),
      new ExpandStrategy(),
      new MurderStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default turtleBot
