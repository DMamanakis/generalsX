/**
 * Parses Claude's JSON directive and translates weights into strategy configuration.
 *
 * Claude returns: { weights: {attack, expand, defend}, directive: string, reasoning: string }
 * We normalize weights to sum to 1.0, then map them to concrete strategy config values
 * and a strategy priority ordering.
 */

/**
 * Parse a JSON directive from Claude's response text.
 * Handles Claude wrapping JSON in markdown code fences or surrounding prose.
 *
 * @param {string} text - Raw response from Claude
 * @returns {{ weights: object, directive: string, reasoning: string }|null}
 */
/**
 * Extract the outermost JSON object from a string using brace counting.
 * Handles nested objects (e.g. {"weights": {"attack": ...}}).
 * @param {string} text
 * @returns {string|null}
 */
function extractOutermostJSON(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function parseDirective(text) {
  if (!text) return null
  try {
    const jsonStr = extractOutermostJSON(text)
    if (!jsonStr) return null

    const parsed = JSON.parse(jsonStr)
    const { weights, directive, reasoning, focusTarget, posture } = parsed

    if (
      !weights ||
      typeof weights.attack !== 'number' ||
      typeof weights.expand !== 'number' ||
      typeof weights.defend !== 'number'
    ) {
      return null
    }

    // Normalize so weights always sum to exactly 1.0
    const sum = weights.attack + weights.expand + weights.defend
    if (sum <= 0) return null

    return {
      weights: {
        attack: weights.attack / sum,
        expand: weights.expand / sum,
        defend: weights.defend / sum,
      },
      directive: directive || 'BALANCED',
      reasoning: reasoning || '',
      // Multiplayer target selection and overall stance — both optional, default to
      // null so responses/tests predating this schema still parse cleanly.
      focusTarget: typeof focusTarget === 'number' ? focusTarget : null,
      posture: typeof posture === 'string' ? posture : null,
    }
  } catch {
    return null
  }
}

/**
 * Posture-based weight adjustments layered on top of the LLM's raw weights, then
 * renormalized to sum to 1.0. Lets the LLM express one overall stance instead of
 * hand-balancing three interacting floats every consult.
 */
const POSTURE_ADJUSTMENTS = {
  ALL_IN: { attack: 0.25, expand: 0, defend: -0.15 },
  TURTLE: { attack: -0.15, expand: -0.05, defend: 0.20 },
  HARASS: { attack: 0.10, expand: 0.05, defend: -0.05 },
}
/** Floor so no weight collapses to (near) zero after a posture adjustment */
const MIN_WEIGHT = 0.05

/**
 * Apply a posture adjustment to a weights triple and renormalize to sum to 1.0.
 * Unknown/null postures return the weights unchanged.
 * @param {{ attack, expand, defend }} weights
 * @param {'ALL_IN'|'TURTLE'|'HARASS'|null} posture
 * @returns {{ attack, expand, defend }}
 */
export function applyPosture(weights, posture) {
  const adjustment = POSTURE_ADJUSTMENTS[posture]
  if (!adjustment) return weights

  const adjusted = {
    attack: Math.max(MIN_WEIGHT, weights.attack + adjustment.attack),
    expand: Math.max(MIN_WEIGHT, weights.expand + adjustment.expand),
    defend: Math.max(MIN_WEIGHT, weights.defend + adjustment.defend),
  }
  const sum = adjusted.attack + adjusted.expand + adjusted.defend

  return {
    attack: adjusted.attack / sum,
    expand: adjusted.expand / sum,
    defend: adjusted.defend / sum,
  }
}

/**
 * Translate weights into concrete config objects for strategies that accept them.
 *
 * attack  ↑ → lower cityArmyBuffer   (grab cities even against garrison)
 * expand  ↑ → lower minArmySize      (creep with smaller forces)
 * defend  ↑ → lower consolidate minArmySize (pull armies home more aggressively)
 *
 * @param {{ attack, expand, defend }} weights
 * @returns {{ capture, expand, consolidate }}
 */
export function weightsToStrategyConfig(weights) {
  const { attack, expand, defend } = weights
  return {
    capture: {
      cityArmyBuffer: Math.round(1 + (1 - attack) * 4), // 1 (max attack) → 5 (max defend)
    },
    expand: {
      minArmySize: Math.round(2 + (1 - expand) * 6),    // 2 (max expand) → 8 (min expand)
    },
    consolidate: {
      minArmySize: Math.round(1 + (1 - defend) * 8),    // 1 (max defend) → 9 (min defend)
    },
  }
}

/**
 * Return an ordered array of strategy slot names for the given weights.
 * Slot names correspond to keys in aiBot's this._strategies map.
 *
 * - attack dominant  → hunt generals first, expand second
 * - defend dominant  → consolidate home, limit risk
 * - expand dominant  → grow territory, then hunt
 *
 * @param {{ attack, expand, defend }} weights
 * @returns {string[]}
 */
export function weightsToStrategyOrder(weights) {
  const { attack, expand, defend } = weights

  if (attack >= expand && attack >= defend) {
    return ['defend', 'mdk', 'capture', 'expand', 'explore']
  }
  if (defend >= attack && defend >= expand) {
    return ['defend', 'consolidate', 'capture', 'expand', 'mdk', 'explore']
  }
  // expand dominant
  return ['defend', 'expand', 'capture', 'mdk', 'explore']
}
