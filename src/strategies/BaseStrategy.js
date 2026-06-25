/**
 * Base class for all bot strategies.
 * Strategies are stateless — they receive game + intel and return move lists.
 */
export class BaseStrategy {
  /**
   * Evaluate whether this strategy has any viable moves.
   * @param {object} game - Current game state
   * @param {object} intel - Gathered intel
   * @param {string} foreignPolicy - Current FOREIGN_POLICY value
   * @returns {boolean} True if this strategy should be attempted
   */
  evaluate(game, intel, foreignPolicy) { // eslint-disable-line no-unused-vars
    throw new Error('evaluate() must be implemented by subclass')
  }

  /**
   * Generate a list of attack queue objects for this strategy.
   * @param {object} game - Current game state
   * @param {object} intel - Gathered intel
   * @param {string} foreignPolicy - Current FOREIGN_POLICY value
   * @returns {Array} Array of attack queue objects
   */
  generateMoves(game, intel, foreignPolicy) { // eslint-disable-line no-unused-vars
    throw new Error('generateMoves() must be implemented by subclass')
  }
}
