import { BaseStrategy } from '../../strategies/BaseStrategy'

describe('BaseStrategy', () => {
  describe('constructor', () => {
    it('should default config to {} when none is passed', () => {
      const strategy = new BaseStrategy()
      expect(strategy.config).toEqual({})
    })

    it('should store a passed config object', () => {
      const config = { minArmySize: 5 }
      const strategy = new BaseStrategy(config)
      expect(strategy.config).toBe(config)
    })
  })

  describe('evaluate()', () => {
    it('should throw an error indicating it must be implemented by subclass', () => {
      const strategy = new BaseStrategy()
      expect(() => strategy.evaluate()).toThrow('evaluate() must be implemented by subclass')
    })
  })

  describe('generateMoves()', () => {
    it('should throw an error indicating it must be implemented by subclass', () => {
      const strategy = new BaseStrategy()
      expect(() => strategy.generateMoves()).toThrow('generateMoves() must be implemented by subclass')
    })
  })
})
