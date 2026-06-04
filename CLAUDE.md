# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeneralsX is a composable strategy framework for building bots that play on [bot.generals.io](http://bot.generals.io). It runs as a React web app that connects to the generals.io game server via Socket.IO. The UI lets you select a bot variant, join a custom game lobby, and watch the bot play.

## Setup

Copy `src/config.template.js` to `src/config.js` and fill in your bot credentials (game ID, user IDs, bot names, bot variant). `config.js` is gitignored.

## Commands

```bash
npm start          # Start dev server (React)
npm run build      # Production build
npm test           # Run tests in watch mode
npm run test:ci    # Run tests with coverage (CI mode)
npm run lint       # Lint all JS/JSX files
npm run lint:fix   # Auto-fix lint issues
```

To run a single test file:
```bash
npm test -- --testPathPattern="botFramework"
```

Pre-push hook runs `npm run lint && npm run test:ci` automatically via Husky.

## Architecture

### Bot Framework (strategy pattern)

The core abstraction is in `src/bots/botFramework.js`. Each bot preset (e.g. `murderBot.js`, `enigmaBot.js`) creates a `BotFramework` with an **ordered array of strategy instances** (highest-priority first).

Each game turn:
1. `BotFramework.move()` calls `gatherIntel()` → `determineForeignPolicy()` → `_validateQueue()` → `_fillQueue()`
2. `_fillQueue()` iterates strategies in order; the first strategy whose `evaluate()` returns `true` and whose `generateMoves()` returns valid moves wins that turn.
3. The framework emits one `attack` socket event per turn.

### Strategy classes

All strategies extend `BaseStrategy` (`src/strategies/BaseStrategy.js`) and implement:
- `evaluate(game, intel) → boolean` — whether this strategy has viable moves this turn
- `generateMoves(game, intel) → Array` — returns attack queue objects

Attack queue objects must have: `{ attackerIndex, targetIndex, mode, priority, sendHalf }`.

### Game state (`game` object)

Passed into every strategy and intel function. Key fields:
- `game.terrain[]` — flat array; negative = empty/mountain/fog, non-negative = playerIndex owning that tile
- `game.armies[]` — army count per tile index
- `game.locations[]` — flat array of `LocationObject` (built each turn by `buildGameMap`)
- `game.locationObjectMap[][]` — 2D grid of the same `LocationObject`s
- `game.myGeneralLocationIndex`, `game.generals[]`, `game.opponents[]`, `game.myScore`

### Intel pipeline

`src/intel/intelGathering.js` — `gatherIntel(game, prevIntel)` rebuilds the map then categorizes tiles into `myTopArmies`, `emptyTerritories`, `visibleOpponentTerritories`, `unexploredTerritories`, etc. The `unexploredTerritories` Set persists across turns via `prevIntel`.

`src/intel/foreignPolicy.js` — `determineForeignPolicy(game, intel)` returns a `FOREIGN_POLICY` constant (EXPLORE / EXPAND / MURDER / DEFEND) that strategies use to decide their behavior.

### Client layer

`src/client/client.js` wires Socket.IO events (`game_start`, `game_update`, `game_lost`, `game_won`) to the bot's `init()` and `move()` methods. The React `Play` page calls `InitializeSocket()` and exposes Join/ForceStart/Quit controls.

### Adding a new bot

1. Create strategies in `src/strategies/` extending `BaseStrategy`
2. Create a bot file in `src/bots/` that instantiates `BotFramework` with your strategy priority list
3. Add the bot to `BOT_MAP` in `src/client/client.js`

## Testing

Tests live in `src/__tests__/` mirroring the `src/` structure. Use `initializeGameState(terrainMode, armyMode)` from `src/testUtils/testHelper.js` to get a pre-built game state. Available terrain modes: `empty`, `mountainous`, `foggy`, `occupiedCorner`, `withOpponent`. Available army modes: `allArmiesOnGeneral`, `twoLargeArmies`, `cornerArmies`, `spread`.

Coverage thresholds: 30% branches, 40% functions/lines/statements (excluding `index.js`, `App.js`, `theme.js`, `config.js`).
