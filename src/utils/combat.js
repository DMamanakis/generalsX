/**
 * Calculate the net army surplus after an attack.
 * Positive means the attacker wins; negative means the defender wins.
 * @param {object} attacker - Location object of the attacker
 * @param {object} target - Location object of the target
 * @param {object} game - Current game state
 * @returns {number} Army differential
 */
export function getArmyAttackDiff(attacker, target, game) {
  if (!game) {
    throw new Error('getArmyAttackDiff requires game context')
  }
  const sameTeam = attacker.terrain === target.terrain ||
    (game.teams && game.teams[attacker.terrain] === game.teams[target.terrain])

  if (sameTeam) {
    return attacker.armies + (target.armies - 1)
  }
  return attacker.armies - target.armies - 1
}

/**
 * Return true if the attacker can capture the target tile this turn.
 * @param {object} attacker - Attacker location object
 * @param {object} target - Target location object
 * @param {object} game - Current game state
 * @returns {boolean}
 */
export function canCapture(attacker, target, game) {
  return getArmyAttackDiff(attacker, target, game) > 0
}

/**
 * Estimate total attacking power along a path.
 * @param {Array} path - Array of location objects (source to target)
 * @param {object} game - Current game state
 * @returns {number} Net army count at destination
 */
export function pathStrength(path, game) {
  if (!path || path.length === 0) return 0
  let strength = path[path.length - 1].armies
  for (let i = path.length - 2; i >= 0; i--) {
    strength = getArmyAttackDiff({armies: strength, terrain: game.playerIndex}, path[i], game)
  }
  return strength
}
