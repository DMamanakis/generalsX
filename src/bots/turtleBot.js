import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { ConsolidateStrategy } from '../strategies/ConsolidateStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { MdkStrategy } from '../strategies/MdkStrategy'

/**
 * TurtleBot preset: defensive consolidation and fortification.
 * Strategies (priority order): Defend > Consolidate > Capture > Expand > Mdk
 *
 * Config choices:
 *   - ExpandStrategy minArmySize:8  — only spreads with sizeable armies, not every 2-unit stack
 *   - CaptureStrategy cityArmyBuffer:3 — cautious about cities, but not so conservative that
 *     it never clears typical 40-50 garrisons — turtles need cities to build up forces too
 */
const turtleBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new ConsolidateStrategy(),
      new CaptureStrategy({ cityArmyBuffer: 3 }),
      new ExpandStrategy({ minArmySize: 8 }),
      new MdkStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default turtleBot
