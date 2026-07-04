// Copy this file to config.js and fill in your bot credentials.
// config.js is gitignored to keep credentials out of version control.

const config = {
  GAME_ID: 'your-custom-game-id',

  // OpenAI API key — required only if using AiBot.
  // Recommended: use .env.local instead (add REACT_APP_OPENAI_API_KEY=sk-...)
  // Get your key at https://platform.openai.com/api-keys
  OPENAI_API_KEY: 'sk-your-key-here',


  // Bot 1
  // BOT_USER_ID_1 must come from a fresh ID that has never had a username set through
  // the normal generals.io website UI (open an incognito window, go straight to
  // bot.generals.io, and read the auto-generated ID out of localStorage before doing
  // anything else) — an ID that's already picked a human username gets rejected when
  // registering as a bot. BOT_NAME_1 must start with the literal "[Bot]" prefix
  // (no space) for the server to accept it as a bot registration.
  BOT_USER_ID_1: 'your-bot-user-id',
  BOT_NAME_1: '[Bot]GeneralsX',
  BOT_VARIANT_1: 'MiddleBot',

  // Bot 2
  BOT_USER_ID_2: 'your-second-bot-user-id',
  BOT_NAME_2: '[Bot]GeneralsX-2',
  BOT_VARIANT_2: 'MdkBot',
}

export default config
