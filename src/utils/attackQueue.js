export const PRIORITY = {
  MDK: 100,
  DEFEND: 50,
  REINFORCE: 40, // send troops to teammate
  CAPTURE: 20,
  HANDOFF: 15,   // capture neutral tile and push it to teammate
  EXPAND: 10,
  CREEP: 5,
  EXPLORE: 1,
  DEFAULT: 0,
}

/**
 * Create a standardized attack queue entry.
 * @param {object} params
 * @param {string} params.mode - Move label (e.g. 'MURDER', 'CREEP')
 * @param {object|number} params.attacker - Attacker location object or index
 * @param {object|number} params.target - Target location object or index
 * @param {boolean} [params.sendHalf] - Whether to send only half armies
 * @param {number} [params.priority] - Move priority (higher = more important)
 * @returns {object|null} Attack queue object, or null if indices are invalid
 */
export function makeAttackQueueObject({mode, attacker, target, sendHalf, priority}) {
  const attackerIndex = attacker && attacker.idx !== undefined ? attacker.idx : attacker
  const targetIndex = target && target.idx !== undefined ? target.idx : target

  if (typeof attackerIndex !== 'number' || typeof targetIndex !== 'number') {
    return null
  }

  return {
    mode: mode || 'notSet',
    attackerIndex,
    targetIndex,
    sendHalf: sendHalf || false,
    priority: priority !== undefined ? priority : PRIORITY.DEFAULT,
  }
}

/**
 * Validate that an attack queue object has required numeric indices.
 * @param {object} obj - Object to validate
 * @returns {boolean}
 */
export function isValidQueueObject(obj) {
  return obj !== null &&
    obj !== undefined &&
    typeof obj.attackerIndex === 'number' &&
    typeof obj.targetIndex === 'number'
}
