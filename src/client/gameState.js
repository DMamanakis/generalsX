/**
 * Create a fresh game state object for a new game.
 * @param {object} socket - Active socket.io connection
 * @returns {object} Initial game state
 */
export function createGameState(socket) {
  return {
    socket,
    chatRoom: null,
    map: [],
    locations: [],         // Flat array of location objects (from generalsL)
    locationObjectMap: [], // 2D array [row][col] → location object
    generals: [],          // General indices by playerIndex (-1 = unknown)
    cities: [],            // Currently-visible city indices
    knownCities: [],       // All discovered city indices (persists through fog)
    armies: [],            // Army count per tile
    terrain: [],           // Terrain value per tile
    mapWidth: null,
    mapHeight: null,
    mapSize: null,
    myGeneralLocationIndex: null,
    myScore: {},
    playerIndex: null,
    opponents: [],
    team: null,
    teams: null,
    turn: 0,
    gameOver: false,
    replay_url: null,
    usernames: [],
  }
}
