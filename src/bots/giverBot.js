import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { ReinforceTeammateStrategy } from '../strategies/ReinforceTeammateStrategy'
import { CaptureForTeammateStrategy } from '../strategies/CaptureForTeammateStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'

/**
 * GiverBot preset: team-support bot designed for 2v2 play.
 *
 * Philosophy: fortify the teammate to the extreme. Our job is NOT to solo-kill
 * enemies — that's our partner's role. We build territory, feed armies to the
 * teammate, and clear a path for their expansions.
 *
 * Strategy stack (priority order):
 *   1. DefendStrategy           — protect our own general first; a dead giver helps nobody
 *   2. ReinforceTeammateStrategy — march our largest army to the teammate's general
 *                                   (armies transfer to them on contact with their tile)
 *   3. CaptureForTeammateStrategy — grab empty tiles adjacent to teammate territory and
 *                                    push armies onto their tile (coordinate expansions)
 *   4. ExpandStrategy            — grow our own tile count so we always have armies to give
 *   5. ExploreStrategy           — reveal the map as a last resort
 *
 * Config choices:
 *   - ReinforceTeammateStrategy minArmyToShare: 6 — start sharing earlier than default
 *   - CaptureForTeammateStrategy minArmyToCapture: 3 — aggressively hand off cheap tiles
 *   - ExpandStrategy minArmySize: 3 — stay productive even between reinforce runs
 */
const giverBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),
      new ReinforceTeammateStrategy({ minArmyToShare: 6 }),
      new CaptureForTeammateStrategy({ minArmyToCapture: 3 }),
      new ExpandStrategy({ minArmySize: 3 }),
      new ExploreStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default giverBot
