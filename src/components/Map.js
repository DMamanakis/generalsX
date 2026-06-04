import React from 'react'
import useMapData from '../services/useMapData'

export default function Map() {
  const mapData = useMapData()
  const map = mapData.map

  if (!map) return null

  const mapCopy = [...map]
  const mapWidth = mapCopy.splice(0, 1)[0]
  const mapHeight = mapCopy.splice(0, 1)[0]
  const mapSize = mapWidth * mapHeight
  const armies = mapCopy.splice(0, mapSize)
  const terrain = mapCopy

  function terrainToStyleClass(terrainValue) {
    switch (terrainValue) {
      case -4: return 'fog mountain'
      case -3: return 'fog'
      case -2: return 'mountain'
      case 0:  return 'red'
      case 1:  return 'lightblue'
      case 2:  return 'green'
      case 3:  return 'teal'
      case 4:  return 'orange'
      case 5:  return 'pink'
      case 6:  return 'purple'
      case 7:  return 'maroon'
      case 8:  return 'yellow'
      case 9:  return 'brown'
      case 10: return 'blue'
      case 11: return 'purple-blue'
      default: return ''
    }
  }

  function MapSquare({index, terrainValue, armyValue}) {
    return (
      <td title={index} className={terrainToStyleClass(terrainValue)}>
        {armyValue > 0 ? armyValue : ''}
      </td>
    )
  }

  function MapRow({arrayIndex}) {
    const cells = []
    for (let i = arrayIndex; i < arrayIndex + mapWidth; i++) {
      cells.push(
        <MapSquare key={i} index={i} terrainValue={terrain[i]} armyValue={armies[i]} />
      )
    }
    return cells
  }

  return (
    <table id="gameMap">
      <tbody>
        {armies.map((_, arrayIndex) => {
          if (arrayIndex % mapWidth === 0) {
            return (
              <tr key={arrayIndex}>
                <MapRow arrayIndex={arrayIndex} />
              </tr>
            )
          }
          return null
        })}
      </tbody>
    </table>
  )
}
