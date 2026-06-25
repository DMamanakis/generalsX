/**
 * Thin Anthropic SDK wrapper for AiBot strategic consultations.
 *
 * Uses claude-haiku-4-5-20251001 — fast and cheap, ideal for in-game decisions
 * where latency matters more than deep reasoning.
 *
 * dangerouslyAllowBrowser: true is intentional — the API key lives in
 * gitignored config.js and this is a local dev tool, not a public-facing app.
 *
 * Add to src/config.js:
 *   ANTHROPIC_API_KEY: 'sk-ant-...'
 */
import Anthropic from '@anthropic-ai/sdk'
import config from '../config'

const SYSTEM_PROMPT = `You are the strategic brain of a generals.io bot called AiBot. You are RUTHLESS.

generals.io rules: you spawn from a "general" tile. Capturing an enemy's general instantly eliminates them and takes all their territory. Losing your own general = instant game over.

Your priorities in strict order:
1. KILL: Find and destroy enemy generals. Every kill = massive territory gain.
2. EXPAND: Maximize army size and tile count as fast as possible.
3. SURVIVE: Never lose your general crown. Dead = gone.

You control three strategy weights (must sum to 1.0):
- attack: Aggressiveness in hunting enemy generals and taking contested tiles
- expand: Priority on neutral territory capture and army growth
- defend: Willingness to pull armies home to protect your general

Decision guide:
- Enemy general known + you have army advantage → push attack hard (0.55-0.70)
- Early game or no general spotted → balanced expand/attack (0.35-0.45 each)
- Threats near your crown → temporarily boost defend (0.35-0.50), drop attack
- Dominant army lead → don't turtle — go attack (0.55+), wins come from killing

Respond with ONLY a JSON object, no other text:
{"weights": {"attack": 0.XX, "expand": 0.XX, "defend": 0.XX}, "directive": "ATTACK|EXPAND|DEFEND|BALANCED", "reasoning": "one sentence"}`

let client = null

/**
 * Resolve the API key.
 * Priority: REACT_APP_ANTHROPIC_API_KEY env var (set in .env.local) → config.js fallback.
 * @returns {string|undefined}
 */
function resolveApiKey() {
  return process.env.REACT_APP_ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY
}

/**
 * Get or initialize the Anthropic client (lazy singleton).
 * @returns {Anthropic}
 */
function getClient() {
  if (!client) {
    const apiKey = resolveApiKey()
    if (!apiKey) {
      throw new Error(
        'AiBot requires an Anthropic API key.\n' +
        'Option 1 (recommended): add REACT_APP_ANTHROPIC_API_KEY=sk-ant-... to .env.local\n' +
        'Option 2: add ANTHROPIC_API_KEY: "sk-ant-..." to src/config.js'
      )
    }
    client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }
  return client
}

/**
 * Ask Claude for a strategic directive given a compact game state summary.
 * Returns the raw response text; caller is responsible for parsing.
 *
 * @param {string} gameStateSummary - Output of formatGameState()
 * @returns {Promise<string|null>} Response text, or null if content block is non-text
 */
export async function askClaude(gameStateSummary) {
  const claude = getClient()
  const message = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: gameStateSummary }],
  })
  const block = message.content[0]
  return block?.type === 'text' ? block.text : null
}
