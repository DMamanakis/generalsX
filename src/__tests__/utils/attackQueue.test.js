import { makeAttackQueueObject, isValidQueueObject, PRIORITY } from '../../utils/attackQueue'

describe('makeAttackQueueObject', () => {
  it('should create a valid queue object from indices', () => {
    const obj = makeAttackQueueObject({mode: 'CREEP', attacker: 6, target: 7})
    expect(obj).toEqual({
      mode: 'CREEP',
      attackerIndex: 6,
      targetIndex: 7,
      sendHalf: false,
      priority: 0,
    })
  })

  it('should extract idx from location objects', () => {
    const obj = makeAttackQueueObject({
      mode: 'MDK',
      attacker: {idx: 10, armies: 5},
      target: {idx: 15, armies: 2},
      priority: PRIORITY.MDK,
    })
    expect(obj.attackerIndex).toBe(10)
    expect(obj.targetIndex).toBe(15)
    expect(obj.priority).toBe(100)
  })

  it('should return null for invalid inputs', () => {
    const obj = makeAttackQueueObject({mode: 'TEST', attacker: null, target: null})
    expect(obj).toBeNull()
  })

  it('should set sendHalf correctly', () => {
    const obj = makeAttackQueueObject({mode: 'CAPTURE', attacker: 1, target: 2, sendHalf: true})
    expect(obj.sendHalf).toBe(true)
  })
})

describe('isValidQueueObject', () => {
  it('should return true for valid objects', () => {
    expect(isValidQueueObject({attackerIndex: 0, targetIndex: 1})).toBe(true)
  })

  it('should return false for null', () => {
    expect(isValidQueueObject(null)).toBe(false)
  })

  it('should return false for missing indices', () => {
    expect(isValidQueueObject({mode: 'CREEP'})).toBe(false)
  })
})
