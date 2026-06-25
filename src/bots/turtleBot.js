import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { ConsolidateStrategy } from '../strategies/ConsolidateStrategy'
import { CaptureStrategy } from '../strategies/CaptureStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { MurderStrategy } from '../strategies/MurderStrategy'

/**
 * TurtleBot preset: defensive consolidation and fortification.
 * Strategies (priority order): Defend > Consolidate > Capture > Expand > Murder
 *
 * Config choices:
 *   - ExpandStrategy minArmySize:8  — only spreads with sizeable armies, not every 2-unit stack
 *   - CaptureStrategy cityArmyBuffer:5 — only takes very cheap cities, won't overextend for them
 */
const turtleBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new ConsolidateStrategy(),
      new CaptureStrategy({ cityArmyBuffer: 5 }),
      new ExpandStrategy({ minArmySize: 8 }),
      new MurderStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default turtleBot
