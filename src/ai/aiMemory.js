/**
 * Persistent game-to-game memory for AiBot.
 *
 * Stores the last 50 game outcomes and uses wins to learn better starting weights.
 * Once 3+ wins are recorded, currentWeights shift toward the average weights from
 * those wins (70% learned, 30% current) to avoid overfitting small samples.
 *
 * Also keeps *situational* buckets (see src/ai/aiContext.js) keyed by game phase x
 * army parity, so weights can condition on the current situation instead of
 * converging to one global compromise, plus a rolling list of short textual
 * "lessons" written by a post-game LLM reflection (see anthropicClient.askReflection).
 *
 * Storage: localStorage under 'generalsX_aiBot_memory' — persists across sessions,
 * no backend required.
 */

const MEMORY_KEY = 'generalsX_aiBot_memory'
const MAX_GAMES = 50
const MIN_WINS_TO_LEARN = 3
const LEARN_BLEND = 0.7 // how heavily to shift toward winning weights each update
const MAX_LESSONS = 10

export const DEFAULT_WEIGHTS = { attack: 0.45, expand: 0.30, defend: 0.25 }

const DEFAULT_MEMORY = {
  version: 1,
  currentWeights: { ...DEFAULT_WEIGHTS },
  games: [],
  buckets: {},
  lessons: [],
}

/**
 * Load memory from localStorage. Returns default if missing or malformed.
 * @returns {object} memory
 */
export function loadMemory() {
  const fresh = () => ({ ...DEFAULT_MEMORY, currentWeights: { ...DEFAULT_WEIGHTS }, buckets: {}, lessons: [] })
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw)
    if (!parsed.currentWeights || !Array.isArray(parsed.games)) {
      return fresh()
    }
    // Backfill fields absent from memory saved before buckets/lessons existed.
    return {
      ...parsed,
      buckets: parsed.buckets && typeof parsed.buckets === 'object' ? parsed.buckets : {},
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    }
  } catch {
    return fresh()
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
 * Fold one bucket's outcome into its running win/loss/weight-sum stats.
 * @param {object} bucketStats - existing { wins, losses, winWeightSums } or undefined
 * @param {boolean} won
 * @param {{ attack, expand, defend }} weights - weights active in this bucket this game
 * @returns {object} new bucket stats
 */
function foldBucketResult(bucketStats, won, weights) {
  const prev = bucketStats || { wins: 0, losses: 0, winWeightSums: { attack: 0, expand: 0, defend: 0 } }
  if (!won) {
    return { ...prev, losses: prev.losses + 1 }
  }
  return {
    ...prev,
    wins: prev.wins + 1,
    winWeightSums: {
      attack: prev.winWeightSums.attack + weights.attack,
      expand: prev.winWeightSums.expand + weights.expand,
      defend: prev.winWeightSums.defend + weights.defend,
    },
  }
}

/**
 * Record a game result and recompute learned weights (global and situational).
 * Does NOT mutate the input memory object.
 *
 * @param {object} memory - Current memory state
 * @param {object} params
 * @param {boolean} params.won
 * @param {object} params.finalWeights - { attack, expand, defend }
 * @param {number} params.turns
 * @param {object} params.myScore - { total, tiles }
 * @param {object<string, {attack, expand, defend}>} [params.bucketVisits] - situational
 *   buckets (from aiContext.computeContextBucket) the bot was in this game, mapped to
 *   the weights active in each. Optional for backward compatibility.
 * @returns {object} Updated memory
 */
export function recordGameResult(memory, { won, finalWeights, turns, myScore, bucketVisits }) {
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

  const buckets = { ...memory.buckets }
  for (const [bucketKey, weights] of Object.entries(bucketVisits || {})) {
    buckets[bucketKey] = foldBucketResult(buckets[bucketKey], won, weights)
  }

  return { ...memory, games, currentWeights, buckets }
}

/**
 * Normalize a bucket's accumulated winning weights into a {attack,expand,defend} triple.
 * @param {{ wins, winWeightSums }} bucketStats
 * @returns {{ attack, expand, defend }}
 */
function averageBucketWeights({ wins, winWeightSums }) {
  return {
    attack: winWeightSums.attack / wins,
    expand: winWeightSums.expand / wins,
    defend: winWeightSums.defend / wins,
  }
}

/**
 * Return the best-known starting weights for the current situation.
 *
 * Preference order: bucket-specific average (once it has >= MIN_WINS_TO_LEARN wins)
 * → global currentWeights → DEFAULT_WEIGHTS. Conditional learning ("defend more when
 * behind") only kicks in once a bucket has enough winning games to trust.
 *
 * @param {object} memory
 * @param {string} [bucketKey] - situational bucket from aiContext.computeContextBucket.
 *   Omit to get the global learned weights (backward compatible).
 * @returns {{ attack, expand, defend }}
 */
export function getLearnedWeights(memory, bucketKey) {
  const bucketStats = bucketKey && memory.buckets ? memory.buckets[bucketKey] : null
  if (bucketStats && bucketStats.wins >= MIN_WINS_TO_LEARN) {
    return averageBucketWeights(bucketStats)
  }
  return { ...memory.currentWeights }
}

/**
 * Return human-readable stats for a single situational bucket, for prompts/logging.
 * @param {object} memory
 * @param {string} bucketKey
 * @returns {{ games: number, winRate: string, weights: string|null }}
 */
export function getBucketStats(memory, bucketKey) {
  const bucketStats = memory.buckets ? memory.buckets[bucketKey] : null
  if (!bucketStats) return { games: 0, winRate: 'N/A', weights: null }

  const games = bucketStats.wins + bucketStats.losses
  const winRate = games > 0 ? `${(bucketStats.wins / games * 100).toFixed(1)}%` : 'N/A'
  const weights = bucketStats.wins >= MIN_WINS_TO_LEARN
    ? formatWeights(averageBucketWeights(bucketStats))
    : null

  return { games, winRate, weights }
}

/**
 * Append a short textual lesson (from a post-game LLM reflection) to memory,
 * keeping only the most recent MAX_LESSONS entries. Does NOT mutate the input.
 * @param {object} memory
 * @param {{ result: 'won'|'lost', bucket?: string, text: string }} lesson
 * @returns {object} Updated memory
 */
export function addLesson(memory, lesson) {
  if (!lesson || !lesson.text) return memory
  const entry = { timestamp: Date.now(), result: lesson.result, bucket: lesson.bucket || null, text: lesson.text }
  const lessons = [...(memory.lessons || []).slice(-(MAX_LESSONS - 1)), entry]
  return { ...memory, lessons }
}

/**
 * Return the most recent N lessons (default: all, capped at MAX_LESSONS).
 * @param {object} memory
 * @param {number} [n]
 * @returns {Array<{ timestamp, result, bucket, text }>}
 */
export function getLessons(memory, n = MAX_LESSONS) {
  return (memory.lessons || []).slice(-n)
}

/**
 * Format a weights triple as "A=45% E=30% D=25%" for logging/prompts.
 * @param {{ attack, expand, defend }} weights
 * @returns {string}
 */
function formatWeights({ attack, expand, defend }) {
  const pct = v => `${(v * 100).toFixed(0)}%`
  return `A=${pct(attack)} E=${pct(expand)} D=${pct(defend)}`
}

/**
 * Return human-readable summary stats for console logging.
 * @param {object} memory
 * @returns {object}
 */
export function getMemoryStats(memory) {
  const total = memory.games.length
  const wins = memory.games.filter(g => g.result === 'won').length
  return {
    gamesPlayed: total,
    wins,
    losses: total - wins,
    winRate: total > 0 ? `${(wins / total * 100).toFixed(1)}%` : 'N/A',
    weights: formatWeights(memory.currentWeights),
  }
}
