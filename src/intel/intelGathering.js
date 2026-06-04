import { TERRAIN_EMPTY, TERRAIN_FOG } from '../core/constants'
import { buildGameMap } from '../core/gameMap'

const USEFUL_ARMY_BASE = 2
const MID_GAME_TURN_THRESHOLD = 200
const EARLY_GAME_TURN_THRESHOLD = 100

/**
 * Gather and categorize board intelligence from the current game state.
 * Rebuilds locationObjectMap and populates categorized tile lists.
 * @param {object} game - Current game state (mutated in place)
 * @param {object} [prevIntel] - Previous turn's intel (for persistent state like unexploredTerritories)
 * @returns {object} Intel object with categorized tile lists and metrics
 */
export function gatherIntel(game, prevIntel) {
  buildGameMap(game)
  return parseMap(game, prevIntel)
}

function parseMap(game, prevIntel) {
  const usefulArmyThreshold = Math.floor(game.turn / MID_GAME_TURN_THRESHOLD) + USEFUL_ARMY_BASE

  // Preserve unexploredTerritories across turns
  let unexploredTerritories
  if (game.turn === 1) {
    unexploredTerritories = new Set([...Array(game.mapSize).keys()])
  } else if (prevIntel && prevIntel.unexploredTerritories) {
    unexploredTerritories = prevIntel.unexploredTerritories
  } else {
    unexploredTerritories = new Set([...Array(game.mapSize).keys()])
  }

  let undiscovered = true
  let totalAvailableArmyPower = 0

  for (let idx = 0; idx < game.terrain.length; idx++) {
    if (game.terrain[idx] === game.playerIndex) {
      unexploredTerritories.delete(idx)
      if (game.armies[idx] > 1) {
        totalAvailableArmyPower += game.armies[idx] - 1
      }
    } else if (game.terrain[idx] > TERRAIN_EMPTY && game.terrain[idx] !== game.playerIndex) {
      const isTeam = game.teams && game.teams[game.terrain[idx]] === game.team
      if (!isTeam) {
        undiscovered = false
      }
    }
  }

  const emptyTerritories = game.locations.filter(loc => loc.terrain === TERRAIN_EMPTY)
  const foggedTerritories = game.locations.filter(loc => loc.terrain === TERRAIN_FOG)
  const visibleOpponentTerritories = game.locations.filter(loc =>
    loc.terrain > TERRAIN_EMPTY &&
    loc.terrain !== game.playerIndex &&
    (!game.teams || game.teams[loc.terrain] !== game.team)
  )

  const allMyArmies = game.locations
    .filter(loc => loc.isMine)
    .sort((a, b) => b.armies - a.armies)

  // After early game, exclude general from top armies to avoid exposing it
  const myTopArmies = game.locations
    .filter(loc => {
      if (!loc.isMine || loc.armies < usefulArmyThreshold) return false
      if (game.turn >= EARLY_GAME_TURN_THRESHOLD && loc.idx === game.myGeneralLocationIndex) return false
      return true
    })
    .sort((a, b) => b.armies - a.armies)

  return {
    usefulArmyThreshold,
    undiscovered,
    totalAvailableArmyPower,
    unexploredTerritories,
    emptyTerritories,
    foggedTerritories,
    visibleOpponentTerritories,
    myArmies: allMyArmies,
    myTopArmies,
  }
}
