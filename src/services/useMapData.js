import { useState, useEffect } from 'react'

export default function useMapData() {
  const [mapData, setMapData] = useState({})

  useEffect(() => {
    const handler = (event) => {
      setMapData(event.detail)
    }
    document.addEventListener('MAP_UPDATE', handler)
    return () => document.removeEventListener('MAP_UPDATE', handler)
  }, [])

  return mapData
}
