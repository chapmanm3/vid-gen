import OpenAI from 'openai';
import { Script, validateScript } from '../scripts/types';
import { buildFullScriptPrompt } from '../scripts/prompts';

export interface ScriptGenerationResult {
  script: Script;
  tokensUsed: number;
}

export class ScriptGenerator {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateScript(topic: string, durationMinutes = 9): Promise<ScriptGenerationResult> {
    const prompt = buildFullScriptPrompt(topic, durationMinutes);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse OpenAI response as JSON: ${content.slice(0, 200)}`);
    }

    const script = validateScript(parsed);

    return {
      script,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }
}
