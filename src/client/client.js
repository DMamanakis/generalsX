import MurderBot from '../bots/murderBot'
import EnigmaBot from '../bots/enigmaBot'
import FinderBot from '../bots/finderBot'
import TurtleBot from '../bots/turtleBot'
import config from '../config'
import { patch } from './patch'
import { createGameState } from './gameState'
import { getVoiceLine } from './voiceLines'

let forceStartFlag = false
let game = {}
let ai
let gameLog = ''
let socket

export const BOT_MAP = {
  MurderBot,
  EnigmaBot,
  FinderBot,
  TurtleBot,
}

const COLOR_MAP = [
  'RED',
  'LIGHT_BLUE',
  'GREEN',
  'CYAN',
  'ORANGE',
  'PINK',
  'MAGENTA',
  'MAROON',
  'GOLD',
  'BROWN',
  'BLUE',
  'LAVENDER',
]

/**
 * Append a line to the on-screen game log.
 * @param {string} textLine - Text to append
 */
export function addGameLog(textLine) {
  gameLog = `${textLine}\n` + gameLog
  const logEl = document.getElementById('log')
  if (logEl) logEl.innerHTML = gameLog
}

export function ForceStart() {
  setTimeout(() => {
    forceStartFlag = !forceStartFlag
    addGameLog(`Toggled force_start: ${forceStartFlag}`)
    socket.emit('set_force_start', config.GAME_ID, forceStartFlag)
  }, 100)
}

export function Join(userID, username) {
  gameLog = `Connected to lobby: ${config.GAME_ID}`
  const logEl = document.getElementById('log')
  if (logEl) logEl.innerHTML = gameLog
  addGameLog(`Joined custom game at http://bot.generals.io/games/${encodeURIComponent(config.GAME_ID)}`)
  socket.emit('join_private', config.GAME_ID, userID)
}

export function Quit() {
  addGameLog(`Replay: ${game.replay_url}`)
  addGameLog('Game over. Halting execution until next game begin.')
  game.gameOver = true
  forceStartFlag = false
  socket.emit('leave_game')
}

export function Team(gameId, team) {
  socket.emit('set_custom_team', gameId, team)
  addGameLog(`Team ${team} joined`)
}

export function ChooseBotVariant(botVariant) {
  if (BOT_MAP[botVariant]) {
    ai = BOT_MAP[botVariant]
    addGameLog(`${botVariant} selected`)
  } else {
    ai = BOT_MAP.MurderBot
    addGameLog(`Unrecognized bot variant '${botVariant}'. Defaulting to MurderBot`)
  }
}

export function FetchMapData() {
  return {
    cities: game.cities,
    knownCities: game.knownCities,
    map: game.map,
    opponents: game.opponents,
    playerIndex: game.playerIndex,
  }
}

export function InitializeSocket(externalSocket) {
  socket = externalSocket
  socket.on('connect', onConnect)
  socket.on('game_start', onStart)
  socket.on('game_update', onUpdate)
  socket.on('game_lost', onLose)
  socket.on('game_won', onWin)
  socket.on('disconnect', onDisconnect)
}

function onConnect() {
  // socket.emit('set_username', config.BOT_USER_ID, config.BOT_NAME)
}

function onDisconnect() {
  addGameLog('Game disconnected.')
}

export function onStart(startData) {
  addGameLog('Game starting...')

  game = createGameState(socket)
  game.playerIndex = startData.playerIndex
  game.replay_url = `http://bot.generals.io/replays/${encodeURIComponent(startData.replay_id)}`
  game.teams = startData.teams
  game.team = startData.teams ? startData.teams[startData.playerIndex] : null
  game.usernames = startData.usernames
  game.chatRoom = startData.chat_room

  addGameLog(`teams: ${JSON.stringify(startData.teams)}`)

  socket.emit('chat_message', game.chatRoom, getVoiceLine('START'))

  if (ai) {
    ai.init(game)
  }
}

export function onUpdate(updateData) {
  game.map = patch(game.map, updateData.map_diff)
  game.cities = patch(game.cities, updateData.cities_diff)
  game.myGeneralLocationIndex = updateData.generals[game.playerIndex]

  // Track discovered general locations permanently (own general included)
  for (let idx = 0; idx < updateData.generals.length; idx++) {
    const loc = updateData.generals[idx]
    if (loc > -1 && (!game.generals || game.generals[idx] !== -1)) {
      game.generals[idx] = loc
    }
  }

  // Accumulate known city list
  game.cities.forEach(cityIdx => {
    if (!game.knownCities.includes(cityIdx)) {
      game.knownCities.push(cityIdx)
    }
  })

  // Update opponent scoreboard data
  updateData.scores.forEach(score => {
    if (score.i === game.playerIndex) {
      const lostArmies = game.myScore.total >= score.total
      const lostTerritory = game.myScore.tiles < score.tiles
      game.myScore = {...score, lostArmies, lostTerritory}
    } else if (!score.dead) {
      let gatherableArmies = score.total
      const landSetsOfFifty = Math.floor(score.tiles / 50)
      for (let i = landSetsOfFifty; i > 0; i--) {
        gatherableArmies -= 50 * i
      }
      gatherableArmies -= (score.tiles % 50) * (landSetsOfFifty + 1)
      gatherableArmies = Math.max(0, gatherableArmies)

      game.opponents[score.i] = {
        idx: score.i,
        color: COLOR_MAP[score.color],
        dead: score.dead,
        tiles: score.tiles,
        total: score.total,
        availableArmies: score.total - score.tiles,
        gatherableArmies,
        isTeam: game.teams ? game.teams[score.i] === game.team : false,
      }

      if (game.opponents[score.i] && game.generals[score.i] !== -1) {
        if (game.opponents[score.i].generalLocationIndex !== game.generals[score.i]) {
          game.opponents[score.i].generalLocationIndex = game.generals[score.i]
        }
      }
    } else {
      game.opponents[score.i] = -1
    }
  })

  if (!game.mapSize) {
    game.mapWidth = game.map[0]
    game.mapHeight = game.map[1]
    game.mapSize = game.mapWidth * game.mapHeight
  }

  game.armies = game.map.slice(2, game.mapSize + 2)
  game.terrain = game.map.slice(game.mapSize + 2, game.mapSize + 2 + game.mapSize)

  // Remove self-owned cities from the neutral cities list
  game.cities = game.cities.filter(cityIdx => game.terrain[cityIdx] !== game.playerIndex)

  // locationObjectMap is built once per turn inside gatherIntel → buildGameMap
  game.turn = updateData.turn

  if (ai && !game.gameOver) {
    ai.move()
  }

  document.dispatchEvent(new CustomEvent('MAP_UPDATE', {
    detail: {map: [...game.map]},
  }))
}

function onLose() {
  socket.emit('chat_message', game.chatRoom, getVoiceLine('FAILURE'))
  Quit()
  addGameLog('Game lost...disconnecting.\nClick Join Game to rejoin for a rematch.')
}

function onWin() {
  addGameLog('Game won!')
  socket.emit('chat_message', game.chatRoom, getVoiceLine('SUCCESS'))
  Quit()
}


