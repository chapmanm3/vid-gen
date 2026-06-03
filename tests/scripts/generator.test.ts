import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScriptGenerator } from '../../src/scripts/generator';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    };
    constructor() {}
  },
}));

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator;

  beforeEach(() => {
    mockCreate.mockReset();
    generator = new ScriptGenerator('sk-test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateScript', () => {
    it('generates a script from a topic', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockValidScript()) } }],
        usage: { total_tokens: 500 },
      });

      const result = await generator.generateScript('Fall of Rome');

      expect(result.script.title).toBe('The Fall of Rome');
      expect(result.script.segments.length).toBeGreaterThan(0);
      expect(result.tokensUsed).toBe(500);
    });

    it('uses gpt-5.4-mini by default', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockValidScript()) } }],
        usage: { total_tokens: 100 },
      });

      await generator.generateScript('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-5.4-mini' })
      );
    });

    it('uses custom model when specified', async () => {
      const customGenerator = new ScriptGenerator('sk-test-key', 'gpt-4o');

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockValidScript()) } }],
        usage: { total_tokens: 100 },
      });

      await customGenerator.generateScript('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' })
      );
    });

    it('throws when OpenAI returns empty', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      });

      await expect(generator.generateScript('Test')).rejects.toThrow('empty response');
    });

    it('throws when response is not valid JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not json' } }],
        usage: { total_tokens: 0 },
      });

      await expect(generator.generateScript('Test')).rejects.toThrow('Failed to parse');
    });

    it('throws when script fails validation', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ title: '', topic: '', segments: [], estimatedTotalDuration: 0, targetWordCount: 0 }) } }],
        usage: { total_tokens: 0 },
      });

      await expect(generator.generateScript('Test')).rejects.toThrow();
    });

    it('includes correct prompt structure', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockValidScript()) } }],
        usage: { total_tokens: 100 },
      });

      await generator.generateScript('Fall of Rome', 8);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].content).toContain('Fall of Rome');
      expect(callArgs.messages[1].content).toContain('8-minute');
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
    });
  });
});

function mockValidScript() {
  return {
    title: 'The Fall of Rome',
    topic: 'Fall of Rome',
    segments: [
      { type: 'hook', text: 'In 476 AD, an empire fell...', estimatedDuration: 15, keywords: ['rome'] },
      { type: 'intro', text: 'The Roman Empire ruled...', estimatedDuration: 30, keywords: ['empire'] },
      { type: 'body', text: 'The decline began when...', estimatedDuration: 300, keywords: ['decline'] },
      { type: 'conclusion', text: 'Rome teaches us...', estimatedDuration: 30, keywords: ['legacy'] },
      { type: 'cta', text: 'Subscribe for more...', estimatedDuration: 15, keywords: ['subscribe'] },
    ],
    estimatedTotalDuration: 390,
    targetWordCount: 975,
  };
}
