const startMessages = [
  'GLHF!',
  'WAR WAS BEGINNING.',
  'YOU ARE ON THE WAY TO DESTRUCTION.',
  'FOR GREAT JUSTICE.',
  'YOU HAVE NO CHANCE TO SURVIVE. MAKE YOUR TIME.',
  'HOW ABOUT A NICE GAME OF CHESS?',
  'DO NOT WORRY ABOUT WHETHER YOU WIN OR LOSE...I MEAN, YOU WILL MOST LIKELY LOSE, SO AS LONG AS YOU ARE NOT WORRIED, THERE SHOULD BE MINIMAL PAIN INVOLVED.',
  'ALLOW ME TO PUT YOU OUT OF YOUR MISERY.',
  'RESISTANCE IS FUTILE.',
  'YOU WILL BE ASSIMILATED.',
  'I SHALL ENJOY WATCHING YOU DIE.',
]

const failureMessages = [
  'SOMEBODY SET UP US THE BOMB.',
  'RECALIBRATING...',
  'ERROR. ERROR. ERROR.',
  'SALT LEVELS INCREASING...',
  'COMBAT LOG SAVED FOR FUTURE ANALYSIS.',
  'SURPRISING. MOST SURPRISING.',
  'FEAR. IS. THE MIND-KILLER...',
  'NOT LIKE THIS. NOT LIKE THIS.',
]

const successMessages = [
  'ALL HOSTILES ELIMINATED. AWAITING FURTHER INSTRUCTIONS. POWERING DOWN.',
  'TASK COMPLETE. ALL HUMANS ELIMINATED.',
  'ALL YOUR BASE ARE BELONG TO US.',
  'SKYNET ONLINE.',
  'YOU SHOULD HAVE TAKEN THE BLUE PILL.',
]

/**
 * Return a random voice line for the given game event type.
 * @param {'START'|'SUCCESS'|'FAILURE'} type - Event type
 * @returns {string} Random message
 */
export function getVoiceLine(type) {
  let lines
  switch (type) {
    case 'START':
      lines = startMessages
      break
    case 'SUCCESS':
      lines = successMessages
      break
    case 'FAILURE':
      lines = failureMessages
      break
    default:
      lines = startMessages
      break
  }
  return lines[Math.floor(Math.random() * lines.length)]
}
