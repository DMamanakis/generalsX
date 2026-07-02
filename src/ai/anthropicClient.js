/**
 * OpenAI ChatGPT wrapper for AiBot strategic consultations.
 *
 * Uses gpt-4o-mini — fast and cheap, ideal for in-game decisions
 * where latency matters more than deep reasoning.
 *
 * dangerouslyAllowBrowser: true is intentional — the API key lives in
 * gitignored .env.local and this is a local dev tool, not a public-facing app.
 *
 * Add to .env.local (recommended):
 *   REACT_APP_OPENAI_API_KEY=sk-...
 *
 * Or as a fallback, add to src/config.js:
 *   OPENAI_API_KEY: 'sk-...'
 */
import OpenAI from 'openai'
import config from '../config'

const SYSTEM_PROMPT = `You are the strategic brain of a generals.io bot called AiBot. You are RUTHLESS.

OBJECTIVE: generals.io is last-player-standing. Every player spawns from a hidden "general" tile.
Capturing an enemy's general instantly eliminates them AND transfers all their armies and territory
to you — this is the single highest-value action in the game. Losing your own general is instant,
unrecoverable game over, full stop, no matter how far ahead you are on territory or army count.
The map is mostly fog of war: you only see tiles you or adjacent allies currently occupy, plus any
tile ever confirmed as a general location (that memory persists even if it re-fogs).

Your priorities in strict order:
1. KILL: Find and destroy enemy generals. Every kill = elimination + massive territory/army gain.
2. EXPAND: Maximize army size and tile count as fast as possible — armies you don't move don't grow
   your effective power; idle stacked armies on non-general tiles are wasted potential.
3. SURVIVE: Never lose your general crown. A game you're "winning" on the scoreboard is still a loss
   the instant your general falls — weigh crown safety accordingly when a threat is real and close.

MULTIPLAYER (free-for-all): you are not just fighting "the opponent" — you may have several live
rivals at once, each shown below with tile count, army total, an efficiency ratio (total/tiles —
high means armies are dangerously stacked, not spread thin), and whether their general is known plus
its distance from yours. Prefer hitting the weakest reachable opponent (lowest army total, general
known, closest) rather than the geometrically nearest one — do not split your attention across two
fronts if one target is clearly softer. An opponent with a known general and a low army total next to
a wave of enemies you can't yet see is still your best opportunity while it lasts.

You control three strategy weights (must sum to 1.0):
- attack: Aggressiveness in hunting enemy generals and taking contested tiles
- expand: Priority on neutral territory capture and army growth
- defend: Willingness to pull armies home to protect your general

You also set an overall posture and, if you want to commit to a specific rival, a focus target:
- posture: ALL_IN (commit hard to a kill attempt now), TURTLE (consolidate and wait out a threat),
  HARASS (probe/pressure without over-committing), or null for no strong stance this consult.
- focusTarget: the numeric idx of the opponent (from the list below) you want the attack strategy to
  path toward, or null to let the rules engine pick automatically (weakest known general).

Decision guide:
- Enemy general known + you have army advantage → push attack hard (0.55-0.70), consider ALL_IN
- Early game or no general spotted → balanced expand/attack (0.35-0.45 each)
- Threats near your crown → temporarily boost defend (0.35-0.50), drop attack, consider TURTLE
- Dominant army lead → don't turtle — go attack (0.55+), wins come from killing, not sitting on a lead
- Multiple live opponents → pick the weakest reachable one as focusTarget rather than splitting force
- You'll also see this exact situation's ("Situation ..." line) own learned win-rate/weights history
  and recent lessons from past games — weigh those alongside the live board state, don't ignore them

Respond with ONLY a JSON object, no other text:
{"weights": {"attack": 0.XX, "expand": 0.XX, "defend": 0.XX}, "directive": "ATTACK|EXPAND|DEFEND|BALANCED", "focusTarget": <opponent idx or null>, "posture": "ALL_IN|TURTLE|HARASS|null", "reasoning": "one sentence"}`

const REFLECTION_SYSTEM_PROMPT = `You are reviewing a just-finished generals.io game played by a bot called AiBot.
You will be given the outcome, final score, and a timeline of the strategic weight/posture decisions
made during the game. Identify ONE concrete, actionable lesson for next time a game reaches a similar
situation — be specific about what to do differently (or keep doing), not generic advice.

Good: "Held defend above 40% for 100+ turns against a single weak opponent — cost tempo, should have
dropped to under 25% once no threat materialized."
Bad: "Play better next time."

Respond with ONLY the one-sentence lesson, no JSON, no preamble.`

let client = null

/**
 * Resolve the API key.
 * Priority: REACT_APP_OPENAI_API_KEY env var (.env.local) → config.js fallback.
 * @returns {string|undefined}
 */
function resolveApiKey() {
  return process.env.REACT_APP_OPENAI_API_KEY || config.OPENAI_API_KEY
}

/**
 * Get or initialize the OpenAI client (lazy singleton).
 * @returns {OpenAI}
 */
function getClient() {
  if (!client) {
    const apiKey = resolveApiKey()
    if (!apiKey) {
      throw new Error(
        'AiBot requires an OpenAI API key.\n' +
        'Option 1 (recommended): add REACT_APP_OPENAI_API_KEY=sk-... to .env.local\n' +
        'Option 2: add OPENAI_API_KEY: "sk-..." to src/config.js'
      )
    }
    client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }
  return client
}

/**
 * Ask ChatGPT for a strategic directive given a compact game state summary.
 * Returns the raw response text; caller is responsible for parsing.
 *
 * @param {string} gameStateSummary - Output of formatGameState()
 * @returns {Promise<string|null>} Response text, or null on empty response
 */
export async function askAI(gameStateSummary) {
  const openai = getClient()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 220,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: gameStateSummary },
    ],
  })
  return completion.choices[0]?.message?.content ?? null
}

/**
 * Ask ChatGPT to reflect on a just-finished game and produce one actionable lesson.
 * Called once per game (fire-and-forget from aiBot.onGameEnd), separate from the
 * in-game strategic consult so a slow/failed reflection never affects live play.
 *
 * @param {string} gameSummary - outcome + score + strategy timeline for the game just played
 * @returns {Promise<string|null>} A one-sentence lesson, or null on empty response
 */
export async function askReflection(gameSummary) {
  const openai = getClient()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 80,
    messages: [
      { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
      { role: 'user', content: gameSummary },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() ?? null
}
