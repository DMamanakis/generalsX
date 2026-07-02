import {
  parseDirective,
  applyPosture,
  weightsToStrategyConfig,
  weightsToStrategyOrder,
} from '../../ai/aiDirective'

describe('parseDirective', () => {
  it('parses a clean JSON response', () => {
    const text = '{"weights": {"attack": 0.5, "expand": 0.3, "defend": 0.2}, "directive": "ATTACK", "reasoning": "enemy general known"}'
    const result = parseDirective(text)
    expect(result).not.toBeNull()
    expect(result.directive).toBe('ATTACK')
    expect(result.reasoning).toBe('enemy general known')
  })

  it('normalizes weights to sum to 1.0', () => {
    const text = '{"weights": {"attack": 2, "expand": 1, "defend": 1}, "directive": "ATTACK"}'
    const result = parseDirective(text)
    const sum = result.weights.attack + result.weights.expand + result.weights.defend
    expect(sum).toBeCloseTo(1.0)
    expect(result.weights.attack).toBeCloseTo(0.5)
  })

  it('extracts JSON embedded in prose', () => {
    const text = 'Sure! Here is my analysis: {"weights": {"attack": 0.6, "expand": 0.2, "defend": 0.2}, "directive": "ATTACK", "reasoning": "go"} That is my recommendation.'
    const result = parseDirective(text)
    expect(result).not.toBeNull()
    expect(result.weights.attack).toBeCloseTo(0.6)
  })

  it('returns null for empty input', () => {
    expect(parseDirective('')).toBeNull()
    expect(parseDirective(null)).toBeNull()
  })

  it('returns null if no JSON present', () => {
    expect(parseDirective('Expand your territory now.')).toBeNull()
  })

  it('returns null when JSON braces never close (unbalanced)', () => {
    const text = '{"weights": {"attack": 0.5, "expand": 0.3, "defend": 0.2'
    expect(parseDirective(text)).toBeNull()
  })

  it('returns null when the extracted JSON is malformed (JSON.parse throws)', () => {
    const text = '{"weights": {attack: 0.5, "expand": 0.3, "defend": 0.2}}'
    expect(parseDirective(text)).toBeNull()
  })

  it('returns null if weights fields are missing', () => {
    const text = '{"directive": "ATTACK"}'
    expect(parseDirective(text)).toBeNull()
  })

  it('returns null if weights are not numbers', () => {
    const text = '{"weights": {"attack": "high", "expand": 0.2, "defend": 0.2}}'
    expect(parseDirective(text)).toBeNull()
  })

  it('returns null if all weights are zero', () => {
    const text = '{"weights": {"attack": 0, "expand": 0, "defend": 0}}'
    expect(parseDirective(text)).toBeNull()
  })

  it('defaults directive to BALANCED when missing', () => {
    const text = '{"weights": {"attack": 0.33, "expand": 0.34, "defend": 0.33}}'
    const result = parseDirective(text)
    expect(result.directive).toBe('BALANCED')
  })
})

describe('parseDirective — focusTarget/posture', () => {
  it('parses focusTarget and posture when present', () => {
    const text = '{"weights": {"attack": 0.5, "expand": 0.3, "defend": 0.2}, "directive": "ATTACK", "focusTarget": 2, "posture": "ALL_IN", "reasoning": "go"}'
    const result = parseDirective(text)
    expect(result.focusTarget).toBe(2)
    expect(result.posture).toBe('ALL_IN')
  })

  it('defaults focusTarget and posture to null when absent', () => {
    const text = '{"weights": {"attack": 0.5, "expand": 0.3, "defend": 0.2}}'
    const result = parseDirective(text)
    expect(result.focusTarget).toBeNull()
    expect(result.posture).toBeNull()
  })

  it('defaults focusTarget to null when not a number', () => {
    const text = '{"weights": {"attack": 0.5, "expand": 0.3, "defend": 0.2}, "focusTarget": "none"}'
    expect(parseDirective(text).focusTarget).toBeNull()
  })
})

describe('applyPosture', () => {
  const base = { attack: 0.4, expand: 0.3, defend: 0.3 }

  it('returns weights unchanged for a null posture', () => {
    expect(applyPosture(base, null)).toEqual(base)
  })

  it('returns weights unchanged for an unknown posture', () => {
    expect(applyPosture(base, 'NOT_A_POSTURE')).toEqual(base)
  })

  it('boosts attack and lowers defend for ALL_IN, still summing to 1.0', () => {
    const result = applyPosture(base, 'ALL_IN')
    expect(result.attack).toBeGreaterThan(base.attack)
    expect(result.defend).toBeLessThan(base.defend)
    expect(result.attack + result.expand + result.defend).toBeCloseTo(1.0)
  })

  it('boosts defend and lowers attack for TURTLE, still summing to 1.0', () => {
    const result = applyPosture(base, 'TURTLE')
    expect(result.defend).toBeGreaterThan(base.defend)
    expect(result.attack).toBeLessThan(base.attack)
    expect(result.attack + result.expand + result.defend).toBeCloseTo(1.0)
  })

  it('mildly tilts attack up for HARASS, still summing to 1.0', () => {
    const result = applyPosture(base, 'HARASS')
    expect(result.attack).toBeGreaterThan(base.attack)
    expect(result.attack + result.expand + result.defend).toBeCloseTo(1.0)
  })

  it('never lets a weight collapse to zero even under an aggressive posture', () => {
    const lowDefend = { attack: 0.5, expand: 0.45, defend: 0.05 }
    const result = applyPosture(lowDefend, 'ALL_IN')
    expect(result.defend).toBeGreaterThan(0)
    expect(result.attack + result.expand + result.defend).toBeCloseTo(1.0)
  })
})

describe('weightsToStrategyConfig', () => {
  it('returns lower cityArmyBuffer for high attack', () => {
    const aggressive = weightsToStrategyConfig({ attack: 0.8, expand: 0.1, defend: 0.1 })
    const defensive = weightsToStrategyConfig({ attack: 0.1, expand: 0.1, defend: 0.8 })
    expect(aggressive.capture.cityArmyBuffer).toBeLessThan(defensive.capture.cityArmyBuffer)
  })

  it('returns lower minArmySize for high expand', () => {
    const expander = weightsToStrategyConfig({ attack: 0.2, expand: 0.6, defend: 0.2 })
    const nonExpander = weightsToStrategyConfig({ attack: 0.5, expand: 0.1, defend: 0.4 })
    expect(expander.expand.minArmySize).toBeLessThan(nonExpander.expand.minArmySize)
  })

  it('returns lower consolidate minArmySize for high defend', () => {
    const defender = weightsToStrategyConfig({ attack: 0.1, expand: 0.1, defend: 0.8 })
    const attacker = weightsToStrategyConfig({ attack: 0.8, expand: 0.1, defend: 0.1 })
    expect(defender.consolidate.minArmySize).toBeLessThan(attacker.consolidate.minArmySize)
  })

  it('all config values are positive integers', () => {
    const cfg = weightsToStrategyConfig({ attack: 0.33, expand: 0.34, defend: 0.33 })
    expect(cfg.capture.cityArmyBuffer).toBeGreaterThan(0)
    expect(cfg.expand.minArmySize).toBeGreaterThan(0)
    expect(cfg.consolidate.minArmySize).toBeGreaterThan(0)
  })
})

describe('weightsToStrategyOrder', () => {
  it('puts mdk early when attack is dominant', () => {
    const order = weightsToStrategyOrder({ attack: 0.7, expand: 0.2, defend: 0.1 })
    const mdkIdx = order.indexOf('mdk')
    const expandIdx = order.indexOf('expand')
    expect(mdkIdx).toBeLessThan(expandIdx)
  })

  it('puts consolidate early when defend is dominant', () => {
    const order = weightsToStrategyOrder({ attack: 0.1, expand: 0.2, defend: 0.7 })
    expect(order).toContain('consolidate')
    const consolidateIdx = order.indexOf('consolidate')
    const mdkIdx = order.indexOf('mdk')
    expect(consolidateIdx).toBeLessThan(mdkIdx)
  })

  it('puts expand early when expand is dominant', () => {
    const order = weightsToStrategyOrder({ attack: 0.2, expand: 0.6, defend: 0.2 })
    const expandIdx = order.indexOf('expand')
    const mdkIdx = order.indexOf('mdk')
    expect(expandIdx).toBeLessThan(mdkIdx)
  })

  it('always starts with defend', () => {
    const cases = [
      { attack: 0.6, expand: 0.2, defend: 0.2 },
      { attack: 0.1, expand: 0.6, defend: 0.3 },
      { attack: 0.1, expand: 0.1, defend: 0.8 },
    ]
    cases.forEach(w => {
      const order = weightsToStrategyOrder(w)
      expect(order[0]).toBe('defend')
    })
  })

  it('always ends with explore', () => {
    const order = weightsToStrategyOrder({ attack: 0.4, expand: 0.3, defend: 0.3 })
    expect(order[order.length - 1]).toBe('explore')
  })
})
