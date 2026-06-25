/**
 * Persistent game-to-game memory for AiBot.
 *
 * Stores the last 50 game outcomes and uses wins to learn better starting weights.
 * Once 3+ wins are recorded, currentWeights shift toward the average weights from
 * those wins (70% learned, 30% current) to avoid overfitting small samples.
 *
 * Storage: localStorage under 'generalsX_aiBot_memory' — persists across sessions,
 * no backend required.
 */

const MEMORY_KEY = 'generalsX_aiBot_memory'
const MAX_GAMES = 50
const MIN_WINS_TO_LEARN = 3
const LEARN_BLEND = 0.7 // how heavily to shift toward winning weights each update

export const DEFAULT_WEIGHTS = { attack: 0.45, expand: 0.30, defend: 0.25 }

const DEFAULT_MEMORY = {
  version: 1,
  currentWeights: { ...DEFAULT_WEIGHTS },
  games: [],
}

/**
 * Load memory from localStorage. Returns default if missing or malformed.
 * @returns {object} memory
 */
export function loadMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (!raw) return { ...DEFAULT_MEMORY, currentWeights: { ...DEFAULT_WEIGHTS } }
    const parsed = JSON.parse(raw)
    if (!parsed.currentWeights || !Array.isArray(parsed.games)) {
      return { ...DEFAULT_MEMORY, currentWeights: { ...DEFAULT_WEIGHTS } }
    }
    return parsed
  } catch {
    return { ...DEFAULT_MEMORY, currentWeights: { ...DEFAULT_WEIGHTS } }
  }
}

/**
 * Persist memory to localStorage.
 * @param {object} memory
 */
export function saveMemory(memory) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch (e) {
    console.warn('[AiBot] failed to save memory to localStorage', e)
  }
}

/**
 * Record a game result and recompute learned weights.
 * Does NOT mutate the input memory object.
 *
 * @param {object} memory - Current memory state
 * @param {object} params
 * @param {boolean} params.won
 * @param {object} params.finalWeights - { attack, expand, defend }
 * @param {number} params.turns
 * @param {object} params.myScore - { total, tiles }
 * @returns {object} Updated memory
 */
export function recordGameResult(memory, { won, finalWeights, turns, myScore }) {
  const newGame = {
    timestamp: Date.now(),
    result: won ? 'won' : 'lost',
    finalWeights: { ...finalWeights },
    turns,
    myScore: { total: myScore.total || 0, tiles: myScore.tiles || 0 },
  }

  // Keep only the most recent MAX_GAMES entries
  const games = [...memory.games.slice(-(MAX_GAMES - 1)), newGame]

  const wins = games.filter(g => g.result === 'won')
  let currentWeights = { ...memory.currentWeights }

  if (wins.length >= MIN_WINS_TO_LEARN) {
    const n = wins.length
    const avgAttack = wins.reduce((s, g) => s + g.finalWeights.attack, 0) / n
    const avgExpand = wins.reduce((s, g) => s + g.finalWeights.expand, 0) / n
    const avgDefend = wins.reduce((s, g) => s + g.finalWeights.defend, 0) / n

    currentWeights = {
      attack: LEARN_BLEND * avgAttack + (1 - LEARN_BLEND) * memory.currentWeights.attack,
      expand: LEARN_BLEND * avgExpand + (1 - LEARN_BLEND) * memory.currentWeights.expand,
      defend: LEARN_BLEND * avgDefend + (1 - LEARN_BLEND) * memory.currentWeights.defend,
    }
  }

  return { ...memory, games, currentWeights }
}

/**
 * Return the best-known starting weights based on past performance.
 * Falls back to DEFAULT_WEIGHTS if no data.
 * @param {object} memory
 * @returns {{ attack, expand, defend }}
 */
export function getLearnedWeights(memory) {
  return { ...memory.currentWeights }
}

/**
 * Return human-readable summary stats for console logging.
 * @param {object} memory
 * @returns {object}
 */
export function getMemoryStats(memory) {
  const total = memory.games.length
  const wins = memory.games.filter(g => g.result === 'won').length
  const { attack, expand, defend } = memory.currentWeights
  const pct = v => `${(v * 100).toFixed(0)}%`
  return {
    gamesPlayed: total,
    wins,
    losses: total - wins,
    winRate: total > 0 ? `${(wins / total * 100).toFixed(1)}%` : 'N/A',
    weights: `A=${pct(attack)} E=${pct(expand)} D=${pct(defend)}`,
  }
}
