# GeneralsX

A composable strategy framework for building bots that play on [bot.generals.io](http://bot.generals.io). Runs as a React web app that connects to the generals.io game server via Socket.IO. The UI lets you select a bot variant, join a custom game lobby, and watch the bot play in real time.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [How to Play](#how-to-play)
- [Bot Catalog](#bot-catalog)
- [Customizing Bot Behavior](#customizing-bot-behavior)
- [AiBot Setup](#aibot-setup)
- [Team Play](#team-play)
- [Building Your Own Bot](#building-your-own-bot)
- [Architecture Overview](#architecture-overview)
- [Testing](#testing)
- [Commands Reference](#commands-reference)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or later
- npm (comes with Node)
- A generals.io account and bot credentials (user ID + username) — register at [bot.generals.io](http://bot.generals.io)

---

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/DMamanakis/generalsX.git
cd generalsX

# 2. Install dependencies
npm install

# 3. Create your config file (gitignored — safe for credentials)
cp src/config.template.js src/config.js
```

Open `src/config.js` and fill in your credentials:

```js
const config = {
  GAME_ID: 'my-custom-lobby',   // the custom game ID you'll join at bot.generals.io/games/<id>

  // Bot 1
  BOT_USER_ID_1: 'your-bot-user-id',
  BOT_NAME_1:    'YourBotGameName',
  BOT_VARIANT_1: 'MdkBot',      // which bot to start with (can be changed in the UI)

  // Bot 2 (optional — only needed if you run a second browser tab)
  BOT_USER_ID_2: 'your-second-bot-user-id',
  BOT_NAME_2:    'YourBotGameName-2',
  BOT_VARIANT_2: 'MdkBot',
}
export default config
```

> **Where do I get a bot user ID?**  
> Log in at [bot.generals.io](http://bot.generals.io), create a bot account, and copy the user ID from your profile URL.

---

## Configuration

### config.js

| Key | Description |
|-----|-------------|
| `GAME_ID` | Custom lobby ID. Create one at `bot.generals.io/games/<id>` |
| `BOT_USER_ID_1` | Bot account user ID for Bot 1 |
| `BOT_NAME_1` | Display name shown in-game |
| `BOT_VARIANT_1` | Default bot strategy (overridable in UI) |
| `BOT_USER_ID_2` / `BOT_NAME_2` / `BOT_VARIANT_2` | Same for a second bot tab |
| `OPENAI_API_KEY` | *(AiBot only)* Fallback if not using `.env.local` |

### .env.local (recommended for API keys)

If you're using **AiBot**, store your OpenAI API key in a `.env.local` file at the project root (this file is gitignored and never committed):

```
REACT_APP_OPENAI_API_KEY=sk-your-key-here
```

Restart `npm start` after creating or editing this file — Create React App bakes env vars in at start time.

Get your API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

---

## Running the App

```bash
npm start
```

Opens at `http://localhost:3000`. Navigate to:

- **Bot 1:** `http://localhost:3000/play/1`
- **Bot 2:** `http://localhost:3000/play/2`

Each page connects independently to the lobby you configured in `GAME_ID`.

---

## How to Play

### 1. Open the game lobby

In a browser, go to `https://bot.generals.io/games/<your-GAME_ID>`. This is the human-facing view where you (and any opponents) will watch the game.

### 2. Connect your bot

Open `http://localhost:3000/play/1` in another tab or window. The bot automatically joins the lobby on page load. You'll see "Connected to lobby: …" in the game log.

### 3. Select a bot variant

Use the **Bot Variant** dropdown to choose which strategy you want to run. The change takes effect immediately — no restart needed.

### 4. Set a team (optional)

For team games, use the **Team** dropdown to assign your bot to a team number before the game starts. Both bots must be on the same team number to be recognized as teammates.

### 5. Join and start

Click **Join Game** if the bot isn't already in the lobby. Once all players are present, click **Force Start** to begin immediately (or wait for the lobby timer).

### 6. Watch the action

The **Game Log** at the bottom of the page shows real-time events. Enable the **Show Map** checkbox to see a live minimap of the game state.

### 7. Reset for the next game

Click **Quit** to leave the current game or lobby. Then click **Join Game** to rejoin for a rematch. The bot will wait in the lobby until Force Start fires again.

---

## Bot Catalog

All bots share the same interface (`init(game)` + `move()`) and run on the same composable strategy framework. The difference between bots is which strategies they include and in what priority order.

---

### MdkBot *(default — aggressive)*

**Philosophy:** Hunt enemy generals as fast as possible. No defensive hesitation.

**Strategy stack (highest priority first):**

1. `MdkStrategy` — beelines to the nearest known enemy general
2. `CaptureStrategy` — grabs affordable neutral cities along the way
3. `ExpandStrategy` — creeps into adjacent empty tiles
4. `ExploreStrategy` — pushes into unexplored fog when nothing else applies

**Best for:** Free-for-all games where you want a fast, punishing opener. Ruthless once a general is spotted.

---

### EnigmaBot *(defensive stalker)*

**Philosophy:** Same hunt-and-kill as MdkBot but more cautious about cities — only grabs ones it can clearly afford.

**Strategy stack:**

1. `DefendStrategy` — pulls armies home when threatened
2. `MdkStrategy`
3. `CaptureStrategy` *(cityArmyBuffer: 3 — stricter than default)*
4. `ExpandStrategy`
5. `ExploreStrategy`

**Best for:** Longer games where overextending for a cheap city could expose the general.

---

### FinderBot *(explorer)*

**Philosophy:** Map knowledge first. Explores aggressively before committing to an attack.

**Strategy stack:**

1. `ExploreStrategy` — always moving toward unexplored territory
2. `ExpandStrategy`
3. `MdkStrategy`

**Best for:** Large maps, fog-heavy games, or when you want to play cautiously while gathering information.

---

### TurtleBot *(fortress)*

**Philosophy:** Fortify and consolidate. Waits for the opponent to come to it.

**Strategy stack:**

1. `DefendStrategy`
2. `ConsolidateStrategy` — pulls dispersed armies toward the general
3. `CaptureStrategy` *(cityArmyBuffer: 5 — only takes very cheap cities)*
4. `ExpandStrategy` *(minArmySize: 8 — only creeps with big stacks)*
5. `MdkStrategy` — will eventually hunt if the game goes long

**Best for:** Endurance matches and testing your own offensive bots against.

---

### GiverBot *(team support)*

**Philosophy:** In a 2v2, your job is feeding your teammate — not solo killing. Build territory, push armies to your partner, and coordinate expansions so they can snowball.

**Strategy stack:**

1. `DefendStrategy` — dead givers help nobody
2. `ReinforceTeammateStrategy` *(minArmyToShare: 6)* — marches your largest army to your teammate's general to hand off troops
3. `CaptureForTeammateStrategy` *(minArmyToCapture: 3)* — grabs neutral tiles adjacent to teammate territory and pushes armies onto their tile
4. `ExpandStrategy` *(minArmySize: 3)* — keeps growing so there are always armies to give
5. `ExploreStrategy`

**Best for:** Team games only. Pair with any aggressive bot as your partner. See [Team Play](#team-play).

---

### AiBot *(LLM-driven, self-improving)*

**Philosophy:** Completely ruthless, and gets smarter the more it plays. The same rules-based strategy stack plays every turn; in the background, it continuously consults an LLM (`gpt-4o-mini`) for a strategic check-in that adjusts attack/expand/defend weights, sets an overall posture, and can call out a specific opponent to focus on. A new consult fires as soon as the previous one resolves (bounded by a small cooldown for API safety), so consult frequency tracks actual network latency instead of a fixed turn timer — gameplay never blocks waiting on it.

**Default weights:** attack 45% / expand 30% / defend 25%

**What the AI controls each consult:**
- The attack/expand/defend weight split — reorders the strategy stack and tunes `cityArmyBuffer` (Capture) and `minArmySize` (Expand/Consolidate)
- **Posture** — `ALL_IN` (commit to a kill attempt), `TURTLE` (consolidate and wait out a threat), or `HARASS` (probe without over-committing)
- **Focus target** — in multiplayer/FFA games, which live opponent (ranked by tile count, army total, efficiency, and distance to your general) MdkStrategy should path toward, instead of always auto-picking the weakest known general

**Learning, three ways:**
1. **Global weights** — win/loss results are saved to localStorage after every game; after 3+ wins, starting weights shift 70% toward the winning average.
2. **Situational memory** — the same learning happens *per situation* (game phase x army parity relative to the strongest opponent, e.g. `"mid|behind"`), so the bot can learn conditional strategy ("defend more when behind") instead of one global compromise. Falls back to the global average until a bucket has 3+ wins of its own.
3. **Post-game reflection** — after each game, the LLM reviews the full strategy timeline and writes one actionable lesson (e.g. "held defend too high vs a single weak opponent — cost tempo"). The 10 most recent lessons are fed back into future prompts.

**Requires:** `REACT_APP_OPENAI_API_KEY` in `.env.local` (or `OPENAI_API_KEY` in `config.js`). See [AiBot Setup](#aibot-setup).

---

## Customizing Bot Behavior

All strategies accept a config object in their constructor. You can tune any bot's behavior without writing new code:

```js
// CaptureStrategy — only take cities you can clearly afford
new CaptureStrategy({ cityArmyBuffer: 5 })

// ExpandStrategy — only creep with armies of at least 10
new ExpandStrategy({ minArmySize: 10 })

// ExtendedConsolidateStrategy — start consolidating sooner
new ExtendedConsolidateStrategy({ minArmySize: 2, minDistanceToConsolidate: 3 })

// ReinforceTeammateStrategy — only share when you have 10+ armies
new ReinforceTeammateStrategy({ minArmyToShare: 10 })
```

To apply these to an existing bot, just copy the bot file, change the config values, and register it under a new name in `BOT_MAP`.

---

## AiBot Setup

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

2. Create `.env.local` at the project root:
   ```
   REACT_APP_OPENAI_API_KEY=sk-your-key-here
   ```

3. Restart `npm start`

4. Select **AiBot** from the Bot Variant dropdown

The bot logs its decisions to the browser console. Open DevTools → Console to watch it reason through each directive change (weights, posture, focus target). When a game ends, watch for a `[AiBot] lesson learned: ...` line — that's the post-game reflection writing to memory. Memory stats (games played, win rate, learned weights) are also logged on each game start and end.

**Viewing the memory log:**

```js
// In the browser console:
JSON.parse(localStorage.getItem('generalsX_aiBot_memory'))
// → { currentWeights, games: [...], buckets: { "mid|behind": {...}, ... }, lessons: [...] }
```

**Resetting the memory:**

```js
localStorage.removeItem('generalsX_aiBot_memory')
```

---

## Team Play

1. Open two browser tabs: `/play/1` and `/play/2`
2. In the game lobby (`bot.generals.io/games/<id>`), assign players to teams
3. In each bot tab, select a matching team number from the **Team** dropdown
4. Configure one bot as `GiverBot` and the other as an offensive bot (e.g. `MdkBot` or `AiBot`)
5. Force Start

The bots detect teammates automatically via the `teams` data in `game_start`. GiverBot will identify its partner and start reinforcing them once a teammate tile is visible.

---

## Building Your Own Bot

### 1. Create a strategy

Create a file in `src/strategies/` extending `BaseStrategy`:

```js
import { BaseStrategy } from './BaseStrategy'
import { FOREIGN_POLICY } from '../intel/foreignPolicy'

export class MyStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({ myThreshold: 5, ...config })
  }

  // Return true when this strategy has something useful to do
  evaluate(game, intel, foreignPolicy) {
    if (foreignPolicy === FOREIGN_POLICY.DEFEND) return false
    return intel.myTopArmies.length > 0
  }

  // Return an array of attack queue objects
  generateMoves(game, intel, foreignPolicy) {
    // Build and return moves using makeAttackQueueObject()
    return []
  }
}
```

**Key intel fields available in `evaluate` / `generateMoves`:**

| Field | Description |
|-------|-------------|
| `intel.myTopArmies` | My tiles sorted by army size (descending) |
| `intel.emptyTerritories` | Neutral tiles adjacent to my territory |
| `intel.visibleOpponentTerritories` | Visible enemy tiles |
| `intel.threats` | Enemy armies close to my general |
| `intel.unexploredTerritories` | Tiles I've never seen |

**Foreign policy values:** `EXPLORE` → `EXPAND` → `MDK` → `DEFEND`

### 2. Create a bot preset

Create a file in `src/bots/`:

```js
import { BotFramework } from './botFramework'
import { DefendStrategy } from '../strategies/DefendStrategy'
import { MyStrategy } from '../strategies/MyStrategy'
import { ExpandStrategy } from '../strategies/ExpandStrategy'
import { ExploreStrategy } from '../strategies/ExploreStrategy'

const myBot = {
  init(game) {
    this._framework = new BotFramework([
      new DefendStrategy(),      // always include this — safety net
      new MyStrategy({ myThreshold: 8 }),
      new ExpandStrategy(),
      new ExploreStrategy(),
    ])
    this._framework.init(game)
  },

  move() {
    this._framework.move()
  },
}

export default myBot
```

### 3. Register it

In `src/client/client.js`, add to `BOT_MAP`:

```js
import MyBot from '../bots/myBot'

export const BOT_MAP = {
  // ...existing bots...
  MyBot,
}
```

In `src/pages/Play.js`, add to `BOT_VARIANTS`:

```js
const BOT_VARIANTS = ['MdkBot', 'EnigmaBot', ..., 'MyBot']
```

Your new bot now appears in the dropdown.

---

## Architecture Overview

```
src/
├── ai/                     # AiBot support modules
│   ├── aiContext.js        # Situational bucket (game phase x army parity) + distance helpers
│   ├── anthropicClient.js  # OpenAI (gpt-4o-mini) wrapper — strategic consult + post-game reflection
│   ├── aiDirective.js      # Parse LLM response + weights/posture → strategy config & focus target
│   ├── aiMemory.js         # localStorage persistence — global + situational learning, post-game lessons
│   └── gameStateFormatter.js # Game state → compact LLM prompt (score, per-opponent breakdown, history, lessons)
├── bots/                   # Bot presets (strategy lists)
│   ├── botFramework.js     # Orchestrator — runs strategies each turn
│   ├── aiBot.js
│   ├── enigmaBot.js
│   ├── finderBot.js
│   ├── giverBot.js
│   ├── mdkBot.js
│   └── turtleBot.js
├── client/
│   ├── client.js           # Socket.IO event wiring (game_start, game_update, etc.)
│   └── gameState.js        # Game state object factory
├── core/
│   └── locationObject.js   # Per-tile LocationObject constructor
├── intel/
│   ├── foreignPolicy.js    # EXPLORE → EXPAND → MDK → DEFEND decision
│   ├── intelGathering.js   # Builds intel object each turn (myTopArmies, threats, etc.)
│   ├── opponentAnalysis.js # Ranks opponents by vulnerability
│   ├── teamIntel.js        # Finds teammates and their adjacent tiles
│   └── threatDetection.js  # Detects enemy armies near our general
├── strategies/             # All strategy implementations
│   ├── BaseStrategy.js
│   ├── CaptureForTeammateStrategy.js
│   ├── CaptureStrategy.js
│   ├── ConsolidateStrategy.js
│   ├── DefendStrategy.js
│   ├── ExpandStrategy.js
│   ├── ExploreStrategy.js
│   ├── ExtendedConsolidateStrategy.js
│   ├── MdkStrategy.js
│   └── ReinforceTeammateStrategy.js
└── utils/
    ├── attackQueue.js      # makeAttackQueueObject + PRIORITY constants
    ├── combat.js           # canCapture()
    ├── darknessMap.js      # BFS darkness map for exploration
    ├── neighbors.js        # findNeighbors() on the grid
    └── pathfinding.js      # BFS pathfinding + distance maps
```

**Each game turn:**

1. Socket.IO `game_update` fires → `client.js` patches game state
2. `ai.move()` is called
3. `BotFramework.move()` runs:
   - `gatherIntel()` rebuilds the tile map and categorizes tiles
   - `determineForeignPolicy()` decides the current phase (EXPLORE / EXPAND / MDK / DEFEND)
   - `_validateQueue()` discards the current queue if the next move is no longer valid
   - `_fillQueue()` iterates strategies in priority order; the first one whose `evaluate()` returns `true` and whose `generateMoves()` returns valid moves wins the turn
4. The framework emits one `attack` socket event

---

## Testing

Tests live in `src/__tests__/` mirroring the `src/` directory structure.

```bash
npm test              # Watch mode
npm run test:ci       # Single run with coverage report
```

To run a specific file:

```bash
npm test -- --testPathPattern="MdkStrategy"
```

Coverage thresholds (enforced, CI fails below these): 30% branches / 40% functions, lines, statements (UI and config files excluded). In practice the suite runs much higher — statements/lines/functions are effectively 100% and branches ~97%, including `aiBot.js` and `anthropicClient.js` (the `openai` SDK is mocked via `jest.mock('openai', ...)`; see `src/__tests__/ai/anthropicClient.test.js` and `src/__tests__/bots/aiBot.test.js`).

A `testHelper.js` provides pre-built game states for unit tests:

```js
import { initializeGameState } from '../testUtils/testHelper'

const game = initializeGameState('occupiedCorner', 'twoLargeArmies')
```

**Terrain modes:** `empty`, `mountainous`, `foggy`, `occupiedCorner`, `withOpponent`  
**Army modes:** `allArmiesOnGeneral`, `twoLargeArmies`, `cornerArmies`, `spread`

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm test` | Run tests in watch mode |
| `npm run test:ci` | Run tests once with coverage |
| `npm run lint` | Lint all JS/JSX files |
| `npm run lint:fix` | Auto-fix lint issues |
