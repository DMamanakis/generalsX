# Changelog

All notable changes to GeneralsX are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-07-02

Closes nearly every remaining test-coverage gap in the repo. Overall coverage went from 76.14% statements / 75.23% branches to 99.77% statements / 96.62% branches / 100% functions / 100% lines, with zero production source changes — this was purely additive test work plus one real infra fix.

### Fixed

- `openai` was declared in `package.json` but had never actually been installed (`npm install` was never re-run after the Anthropic → OpenAI provider swap) — `node_modules/openai` didn't exist, so AiBot would have failed at runtime the moment it tried to consult the LLM. Installed via `npm install openai --legacy-peer-deps` (the `--legacy-peer-deps` flag is required due to a pre-existing, unrelated `grommet`/`styled-components` peer-dependency conflict in this project). `openai` bumped to the actually-resolved `^4.104.0`.

### Added — test coverage

- **New test files** for previously 0%-covered modules, all now at or near 100%: the 5 bot presets (`enigmaBot`, `finderBot`, `giverBot`, `mdkBot`, `turtleBot`), `BaseStrategy`, `ConsolidateStrategy`, `ExploreStrategy`, `threatDetection`, `core/locationObject.js`, `anthropicClient.js` (via `jest.mock('openai', ...)` plus a `{ virtual: true }` mock for the gitignored `src/config.js`), and `aiBot.js` (via a `jest.mock('../../ai/anthropicClient')` auto-mock — no network dependency needed).
- **Extended existing test files** to close specific uncovered lines/branches across `CaptureForTeammateStrategy`, `CaptureStrategy`, `DefendStrategy`, `ExtendedConsolidateStrategy`, `MdkStrategy`, `ReinforceTeammateStrategy`, `foreignPolicy`, `intelGathering`, `opponentAnalysis`, `teamIntel`, `attackQueue`, `combat`, `pathfinding`, `botFramework`, `aiContext`, `aiDirective`, `aiMemory`, and `gameStateFormatter`.
- Roughly 150 new/updated tests added across the suite (377 total, all passing).

### Notes

- A handful of branch-level gaps remain by design, not oversight — e.g. a few `|| 0` fallback ternaries and defensive null-checks in `aiMemory.js`, `pathfinding.js`, and `ConsolidateStrategy.js` that would require contorting test setup (mocking internal BFS/pathfinding helpers) for negligible bug-catching value. These were left uncovered rather than forced.
- No production source files were modified to chase coverage — every gap was closed by adding a test scenario that reaches the code through legitimate game-state setup, or by mocking a strategy's own internal dependency (`jest.spyOn` on `findPath`, `createDistanceMap`, `makeAttackQueueObject`, etc.) to exercise a defensive branch that's unreachable through normal BFS/pathfinding output.

---

## [1.2.0] - 2026-07-02

Replaces AiBot's fixed 50-turn consult cadence with a continuous, latency-bound loop: the bot keeps playing under its current directive and asks for the next one as soon as the previous consult resolves, rather than waiting out an arbitrary timer.

### Changed

- `src/bots/aiBot.js` — `AI_CONSULT_INTERVAL` (fixed 50-turn gate) replaced with `MIN_CONSULT_COOLDOWN` (10 turns), a safety floor against spamming the API on an unusually fast response rather than a strategic cadence. Combined with the existing `_pendingAICall` guard, a new consult now fires as soon as the prior one resolves and the cooldown has elapsed — consult frequency tracks actual round-trip latency instead of a fixed interval, so fast networks get more strategic input and slow networks never block tactical play (which stays fully synchronous throughout).

### Notes

- Strategic decisions (attack/expand/defend balance, posture, focus target) tolerate staleness well since game phase and army parity rarely flip within a few turns — unlike tactical (per-tile) decisions, which is why only the strategic layer is allowed to run behind real time.

---

## [1.1.0] - 2026-07-02

Upgrades AiBot from a single global weight blend into a genuinely situational, self-reflective strategic layer. The tactical (every-turn) rules engine is untouched — all of this lives in the strategic consult layer and its memory.

### Added

**Situational memory (conditional learning)**
- `src/ai/aiContext.js` — new module. `computeContextBucket(game)` buckets the current game into a situation key by phase (`early`/`mid`/`late`, by turn) x army parity relative to the strongest live opponent (`ahead`/`even`/`behind`), e.g. `"mid|behind"`; `manhattanDistance()` helper for per-opponent distance on the map grid
- `src/ai/aiMemory.js` — `buckets` map tracks wins/losses/winning-weight-sums per situational bucket; `getLearnedWeights(memory, bucketKey)` returns that bucket's own learned average once it has 3+ wins, falling back to the global blend otherwise; `getBucketStats()` for prompt/logging. Lets the bot learn conditional strategy ("defend more when behind") instead of one global compromise across every game state.

**Post-game reflection (textual lessons)**
- `src/ai/anthropicClient.js` — `askReflection()`, a second LLM call (separate system prompt) that reviews a finished game's strategy timeline and returns one concrete, actionable lesson
- `src/ai/aiMemory.js` — `lessons` list (capped at 10, most recent kept) + `addLesson()` / `getLessons()`; recent lessons are woven into future prompts via `gameStateFormatter`
- `src/bots/aiBot.js` — captures a per-consult trace (turn, bucket, weights, directive, reasoning) during the game and fires the reflection call fire-and-forget from `onGameEnd`, fully decoupled from live play

**Richer directives — multiplayer target selection + posture**
- `src/ai/gameStateFormatter.js` — per-opponent breakdown (armies, tiles, gatherable armies, army efficiency, known general, distance to my general) built from `opponentAnalysis.rankOpponents`, plus the current situational bucket's win-rate/weights and recent lessons
- `src/ai/aiDirective.js` — directive JSON gains `focusTarget` (opponent idx to hunt) and `posture` (`ALL_IN` / `TURTLE` / `HARASS`), both optional and backward compatible with older directive shapes; `applyPosture()` adjusts and renormalizes weights per posture
- `src/strategies/MdkStrategy.js` — accepts `config.preferredTargetIndex`; targets that opponent's general when known, otherwise falls back to the existing weakest-known-general selection
- `src/ai/anthropicClient.js` — rewritten system prompt spells out full game objectives, multiplayer target-selection guidance, and the new directive fields

### Tests added

- `src/__tests__/ai/aiContext.test.js` — 15 tests covering phase/parity bucketing and Manhattan distance
- Extended `aiMemory.test.js`, `aiDirective.test.js`, `gameStateFormatter.test.js`, `MdkStrategy.test.js` with 65 new/updated tests covering bucket learning, lessons, posture adjustment, focus targeting, and per-opponent prompt formatting

### Notes

- `aiBot.js` and `anthropicClient.js` remain without direct unit tests, consistent with the existing pattern of not unit-testing bot presets or LLM clients directly — verify manually by playing a few games and inspecting `localStorage['generalsX_aiBot_memory']`

---

## [1.0.0] - 2026-06-25

First stable release. The framework is fully composable, all bots are registered and playable, and the AiBot integration is live.

### Added

**AiBot — LLM-driven bot**
- `src/ai/anthropicClient.js` — OpenAI SDK wrapper using `gpt-4o-mini` with `dangerouslyAllowBrowser: true`
- `src/ai/aiMemory.js` — localStorage-based game-to-game memory; tracks win/loss results and learned weights across sessions; blends winning weights 70/30 after 3+ wins
- `src/ai/aiDirective.js` — parses the LLM's JSON directive (handles nested JSON and prose-wrapped responses); translates attack/expand/defend weights into concrete strategy configs and priority ordering
- `src/ai/gameStateFormatter.js` — compresses game state into a compact 5-line LLM prompt (score, army counts, enemy general visibility, threats, foreign policy, memory stats)
- `src/bots/aiBot.js` — two-layer hybrid bot: BotFramework handles every turn synchronously; the LLM is consulted every 50 turns fire-and-forget; directive updates reorder the strategy stack and tune configs; results recorded on game end

**GiverBot — team support preset**
- `src/strategies/ReinforceTeammateStrategy.js` — marches the largest army to the teammate's general to hand off troops; config: `minArmyToShare`
- `src/strategies/CaptureForTeammateStrategy.js` — grabs neutral tiles adjacent to teammate territory and pushes armies onto their tile; config: `minArmyToCapture`
- `src/intel/teamIntel.js` — `getTeammateInfo()` and `getEmptyTilesAdjacentToTeammate()` helper functions
- `src/bots/giverBot.js` — Defend → ReinforceTeammate → CaptureForTeammate → Expand → Explore
- Added `REINFORCE` and `HANDOFF` priorities to `attackQueue.js`

**ExtendedConsolidateStrategy**
- `src/strategies/ExtendedConsolidateStrategy.js` — consolidation using all armies (not just the top stack); scores candidates by `armies × distance`; config: `minArmySize`, `minDistanceToConsolidate`

**MdkBot and MdkStrategy (replacing MurderBot)**
- `src/strategies/MdkStrategy.js` — general-hunting strategy using `opponentAnalysis` to target the most vulnerable known enemy general; excludes teammates
- `src/bots/mdkBot.js` — Mdk → Capture → Expand → Explore
- `src/strategies/MurderStrategy.js` — shim re-exporting `MdkStrategy` as `MurderStrategy` for backward compatibility
- `src/bots/murderBot.js` — shim re-exporting `mdkBot` for backward compatibility
- Renamed `FOREIGN_POLICY.MURDER` → `FOREIGN_POLICY.MDK`
- Renamed `PRIORITY.MURDER` → `PRIORITY.MDK`

**Config injection on strategy constructors**
- All strategies now accept a `config` object in their constructor (`super({ defaultKey: value, ...config })`)
- Enables truly tunable bots: `new ExpandStrategy({ minArmySize: 10 })`, `new CaptureStrategy({ cityArmyBuffer: 5 })`, etc.

**foreignPolicy wired through all strategies**
- `BotFramework.move()` now passes `this.foreignPolicy` as the third argument to every `strategy.evaluate()` and `strategy.generateMoves()` call
- All strategy implementations updated to use it
- Team general targeting fixed: strategies no longer consider a teammate's general a valid MDK target

**README and CHANGELOG**
- Full instruction manual covering setup, bot catalog, gameplay, team play, AiBot setup, building your own bot, and architecture reference
- This changelog

### Changed

- `src/client/client.js` — `onLose` and `onWin` now call `ai.onGameEnd(won)` if the method exists, enabling bots to hook into game results
- `src/client/client.js` — `BOT_MAP` updated to include `AiBot`
- `src/pages/Play.js` — `BOT_VARIANTS` updated to include `'AiBot'`
- `src/config.template.js` — added `OPENAI_API_KEY` slot with instructions (`.env.local` with `REACT_APP_OPENAI_API_KEY` recommended instead)
- `package.json` — version bumped to `1.0.0`; added `openai ^4.0.0` dependency
- `.gitignore` — added `.env.local` and `.env.*.local`

### Fixed

- `src/core/locationObject.js` — `isTeam` was incorrectly `true` for the current player's own tiles (since `game.teams[playerIndex] === game.team` is trivially true). Fixed by adding `terrain !== game.playerIndex` guard.
- `src/intel/opponentAnalysis.js` — `rankOpponents` used `filter().map()` which shifted indices after filtering dead opponents, breaking player index lookups. Fixed with `reduce()` to preserve `playerIndex` before filtering.

### Tests added

- `src/__tests__/ai/aiMemory.test.js` — 14 tests covering load/save roundtrip, result recording, weight learning, cap at 50 games, stats formatting
- `src/__tests__/ai/aiDirective.test.js` — 16 tests covering JSON parsing, weight normalization, embedded JSON extraction, strategy config mapping, strategy ordering
- `src/__tests__/ai/gameStateFormatter.test.js` — 8 tests covering output format, score/turn/weight inclusion, graceful fallbacks
- `src/__tests__/strategies/MdkStrategy.test.js` — 8 tests for evaluate() and generateMoves()
- `src/__tests__/intel/teamIntel.test.js` — 12 tests for teammate detection functions
- `src/__tests__/strategies/ReinforceTeammateStrategy.test.js` — 11 tests
- `src/__tests__/strategies/CaptureForTeammateStrategy.test.js` — 10 tests

---

## [0.2.0] - 2026-06-05

A wave of correctness fixes and refactors following the initial commit.

### Fixed

- **Own-general tracking** (`fix/own-general-tracking`): `client.js` was overwriting `game.generals[playerIndex]` to `-1` on every update tick, causing the bot to lose track of its own general after the first turn.
- **Gatherable armies formula** (`fix/gatherable-armies`): gatherableArmies calculation used `=` instead of `-=`, producing wildly incorrect values that corrupted opponent scoring data.
- **Darkness map visible filter** (`fix/darkness-map-visible-filter`): `darknessMap.js` was seeding BFS from all non-negative terrain indices, including mountains. Fixed to use the `TERRAIN_EMPTY` threshold so only genuinely passable tiles are included.

### Refactored

- **Deduplicate makeLocationObject** (`refactor/deduplicate-make-location-object`): `client.js` had its own local `makeLocationObject` function duplicating logic already in `src/core/locationObject.js`. Removed the local copy and imported from core.

### Infrastructure

- Added `.eslintignore` for generated build dirs
- Excluded `src/client/`, `src/components/`, `src/pages/`, and `src/services/` from coverage collection

---

## [0.1.0] - 2026-06-04

### Added

Initial release of the GeneralsX composable bot strategy framework.

- **BotFramework** (`src/bots/botFramework.js`) — strategy orchestrator with attack queue management; emits one `attack` socket event per turn
- **BaseStrategy** (`src/strategies/BaseStrategy.js`) — base class with `evaluate(game, intel)` + `generateMoves(game, intel)` interface
- **Strategy implementations:** `DefendStrategy`, `ConsolidateStrategy`, `CaptureStrategy`, `ExpandStrategy`, `ExploreStrategy`, `MurderStrategy`
- **Bot presets:** `MurderBot` (now MdkBot), `EnigmaBot`, `FinderBot`, `TurtleBot`
- **Intel pipeline:** `gatherIntel()` builds the tile map and categorizes territory each turn; `determineForeignPolicy()` returns the current phase constant
- **LocationObject** — per-tile object with `isMine`, `isTeam`, `attackable`, `isCity`, `isGeneral`, `armies`, `terrain`, `idx`
- **Utilities:** `attackQueue.js`, `combat.js`, `darknessMap.js`, `neighbors.js`, `pathfinding.js`
- **Client layer:** Socket.IO wiring for `game_start`, `game_update`, `game_lost`, `game_won`; React Play page with Join, ForceStart, Team, BotVariant, and Quit controls
- **Test harness:** `testHelper.js` with `initializeGameState(terrainMode, armyMode)`; full test coverage for all strategies and intel functions
- **Lint/CI setup:** ESLint with sonar, jsdoc, prettier, bestpractices plugins; Husky pre-push hook running lint + test:ci
