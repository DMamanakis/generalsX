const mockCreate = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}))

// src/config.js is gitignored and may not exist on disk in any given checkout —
// mock it virtually so this test never depends on a local config file being present.
jest.mock('../../config', () => ({ __esModule: true, default: {} }), { virtual: true })

function loadClient() {
  return require('../../ai/anthropicClient')
}

describe('anthropicClient', () => {
  const originalEnv = process.env.REACT_APP_OPENAI_API_KEY

  beforeEach(() => {
    jest.resetModules()
    mockCreate.mockReset()
    delete process.env.REACT_APP_OPENAI_API_KEY
  })

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.REACT_APP_OPENAI_API_KEY
    else process.env.REACT_APP_OPENAI_API_KEY = originalEnv
  })

  describe('askAI', () => {
    it('throws when no API key is configured', async () => {
      const { askAI } = loadClient()
      await expect(askAI('prompt')).rejects.toThrow(/OpenAI API key/)
    })

    it('resolves the API key from REACT_APP_OPENAI_API_KEY and returns the response content', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"weights":{}}' } }] })
      const { askAI } = loadClient()
      const result = await askAI('game state summary')
      expect(result).toBe('{"weights":{}}')
    })

    it('calls the chat completion with the expected model, token limit, and messages', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })
      const { askAI } = loadClient()
      await askAI('game state summary')
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        max_tokens: 220,
        messages: [
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'game state summary' },
        ],
      })
    })

    it('returns null when the response has no choices', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [] })
      const { askAI } = loadClient()
      expect(await askAI('prompt')).toBeNull()
    })

    it('reuses the same client across calls instead of re-throwing on a missing key', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'first' } }] })
      const { askAI } = loadClient()
      await askAI('one')
      // Simulate the key disappearing after the client was already constructed —
      // the lazy singleton should not re-check the key on subsequent calls.
      delete process.env.REACT_APP_OPENAI_API_KEY
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'second' } }] })
      const result = await askAI('two')
      expect(result).toBe('second')
    })
  })

  describe('askReflection', () => {
    it('calls the chat completion with the expected model and token limit', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'a lesson' } }] })
      const { askReflection } = loadClient()
      await askReflection('game summary')
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        max_tokens: 80,
        messages: [
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'game summary' },
        ],
      })
    })

    it('returns the response content trimmed', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: { content: '  attack sooner next time  ' } }] })
      const { askReflection } = loadClient()
      expect(await askReflection('summary')).toBe('attack sooner next time')
    })

    it('returns null when the response has no content', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = 'sk-test'
      mockCreate.mockResolvedValue({ choices: [{ message: {} }] })
      const { askReflection } = loadClient()
      expect(await askReflection('summary')).toBeNull()
    })

    it('throws when no API key is configured', async () => {
      const { askReflection } = loadClient()
      await expect(askReflection('summary')).rejects.toThrow(/OpenAI API key/)
    })
  })
})
