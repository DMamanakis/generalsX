import React, { useEffect, useState } from 'react'
import { Button, Box, CheckBox, Select } from 'grommet'
import io from 'socket.io-client'
import config from '../config'
import Map from '../components/Map'
import { ForceStart, Join, Quit, Team, ChooseBotVariant, InitializeSocket } from '../client/client'

const socket = io('wss://botws.generals.io')
InitializeSocket(socket)

const BOT_VARIANTS = ['MdkBot', 'MiddleBot', 'FinderBot', 'TurtleBot', 'GiverBot', 'AiBot']

export default function Play({match}) {
  const botId = match.params.bot

  const bot = {
    id: config[`BOT_USER_ID_${botId}`],
    name: config[`BOT_NAME_${botId}`],
    variant: config[`BOT_VARIANT_${botId}`],
  }

  const cache = (mode, data) => {
    if (mode === 'READ') {
      let local = localStorage.getItem(`generals-x-${botId}`)
      local = local ? JSON.parse(local) : {botVariantValue: 'MiddleBot', showMap: true}
      return local[data]
    } else if (mode === 'WRITE') {
      localStorage.setItem(`generals-x-${botId}`, JSON.stringify(data))
    }
  }

  const [teamValue, setTeamValue] = useState()
  const [botVariantValue, setBotVariantValue] = useState(cache('READ', 'botVariantValue'))
  const [showMap, setShowMap] = useState(cache('READ', 'showMap'))

  const handleTeamChange = (choice) => {
    setTeamValue(choice)
    Team(config.GAME_ID, choice)
  }

  const handleBotVariantChange = (choice) => {
    setBotVariantValue(choice)
    ChooseBotVariant(choice)
    cache('WRITE', {botVariantValue: choice, showMap})
  }

  const handleMapDisplayChange = (checked) => {
    setShowMap(checked)
    cache('WRITE', {botVariantValue, showMap: checked})
  }

  useEffect(() => {
    Join(bot.id, bot.name)
    ChooseBotVariant(botVariantValue || bot.variant)

    const mutationCallback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          mutation.target.scrollTop = mutation.target.scrollHeight
        }
      }
    }

    const observer = new MutationObserver(mutationCallback)
    const logEl = document.getElementById('log')
    if (logEl) {
      observer.observe(logEl, {attributes: false, childList: true, subtree: true})
    }

    return () => observer.disconnect()
  }, []) // eslint-disable-line -- intentional mount-only effect

  return (
    <>
      <p>
        GAME ID: <a href={`https://bot.generals.io/games/${config.GAME_ID}`} target="_blank" rel="noopener noreferrer">{config.GAME_ID}</a>
        {' '}<em>(close this window to leave a lobby or quit)</em>
      </p>
      <Box pad="small">
        <div>
          <Button onClick={() => ForceStart()} label="Force Start" />
          <Button label="Join Game" margin="xsmall" onClick={() => Join(bot.id, bot.name)} />
          <Select
            placeholder="Team"
            size="xsmall"
            margin="xsmall"
            options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
            value={teamValue}
            onChange={({option}) => handleTeamChange(option)}
          />
          <Select
            placeholder="Bot Variant"
            size="xsmall"
            margin="xsmall"
            options={BOT_VARIANTS}
            value={botVariantValue}
            onChange={({option}) => handleBotVariantChange(option)}
          />
          <Button label="Quit" margin="xsmall" onClick={() => Quit()} />
          <br />
          <CheckBox
            label="Show Map"
            pad="xsmall"
            checked={showMap}
            onChange={(evt) => handleMapDisplayChange(evt.target.checked)}
          />
        </div>
      </Box>
      <Box>
        <span>Game Log:</span>
        <pre
          id="log"
          style={{
            backgroundColor: '#eee',
            fontSize: '16px',
            lineHeight: '16px',
            margin: 0,
            maxHeight: '30vh',
            minHeight: '6em',
            overflow: 'scroll',
          }}
        >
          {`Connecting to lobby: ${config.GAME_ID}`}
        </pre>
      </Box>
      {showMap && (
        <Box>
          <Map />
        </Box>
      )}
    </>
  )
}
