/**
 * Shared city-awareness helpers, consumed by CaptureStrategy, CaptureForTeammateStrategy,
 * DefendStrategy, ConsolidateStrategy, and ExtendedConsolidateStrategy.
 *
 * A city has no distinct terrain value in this game's protocol — an unowned city shares
 * TERRAIN_EMPTY with plain ground, and a fogged city reads as TERRAIN_FOG_MTN. Cities are
 * identified purely by index membership in game.knownCities (see core/locationObject.js's
 * isCity flag), with garrison size read from game.armies[idx] — which, like any fogged
 * tile, retains its last-known value once out of sight (the same mechanism MdkStrategy
 * already relies on to hunt a general it can no longer see).
 */
import { findPath } from '../utils/pathfinding'

/**
 * Return known cities not owned by me or a teammate, sorted cheapest-garrison-first.
 * Uses game.knownCities (persists through fog) rather than game.cities (visible-only
 * neutral/enemy cities), so a city scouted once stays a target even after it fogs back over.
 * @param {object} game
 * @returns {Array<{ idx: number, armies: number }>}
 */
export function getCapturableCities(game) {
  if (!game.knownCities || !game.knownCities.length) return []
  return game.knownCities
    .filter(idx => game.terrain[idx] !== game.playerIndex)
    .filter(idx => !(game.teams && game.terrain[idx] >= 0 && game.teams[game.terrain[idx]] === game.team))
    .map(idx => ({ idx, armies: game.armies[idx] || 0 }))
    .sort((a, b) => a.armies - b.armies)
}

/**
 * Return the indices of cities I currently own (captured, still tracked in knownCities).
 * @param {object} game
 * @returns {number[]}
 */
export function getMyCities(game) {
  if (!game.knownCities || !game.knownCities.length) return []
  return game.knownCities.filter(idx => game.terrain[idx] === game.playerIndex)
}

/**
 * Find the best (source army, city) pairing to capture: the cheapest-garrison city with
 * any reachable, affordable army among intel.myTopArmies — not just the single largest
 * stack — using the closest such army when more than one qualifies.
 * @param {object} game
 * @param {object} intel
 * @param {number} buffer - cityArmyBuffer; source must exceed garrison + buffer to qualify
 * @returns {{ source: object, city: { idx, armies }, path: Array }|null}
 */
export function findBestCityCapture(game, intel, buffer) {
  if (!intel.myTopArmies.length) return null
  const cities = getCapturableCities(game)

  for (const city of cities) {
    const capableSources = intel.myTopArmies.filter(a => a.armies > city.armies + buffer)
    if (!capableSources.length) continue

    let best = null
    for (const source of capableSources) {
      const path = findPath({location: source, targetLocation: city.idx, game})
      if (path.length <= 1) continue
      if (!best || path.length < best.path.length) {
        best = { source, city, path }
      }
    }
    if (best) return best
  }

  return null
}

/**
 * Return the location index that Defend/Consolidate strategies should rally toward.
 * A threat directly at the general always wins — losing the general ends the game — so any
 * general-level threat (or the absence of any threat at all) resolves to the general,
 * identical to the pre-city-aware behavior every existing test already exercises. Only when
 * a city is threatened and the general is not does this redirect the rally point to the city.
 * @param {object} game
 * @param {object} intel
 * @returns {number|null}
 */
export function getDefenseTarget(game, intel) {
  const threats = intel.threats || []
  const hasGeneralThreat = threats.some(
    t => t.type === 'ADJACENT_TO_GENERAL' || t.type === 'ENEMY_GENERAL_NEARBY',
  )
  if (hasGeneralThreat || !game.myGeneralLocationIndex) return game.myGeneralLocationIndex

  const cityThreat = threats.find(t => t.type === 'ADJACENT_TO_CITY')
  return cityThreat ? cityThreat.cityIdx : game.myGeneralLocationIndex
}
