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
    const { weights, directive, reasoning } = parsed

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
    }
  } catch {
    return null
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
