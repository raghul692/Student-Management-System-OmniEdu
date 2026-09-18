import {
  AIProvider,
  AIChatMessage,
  AICompletionOptions,
  AICompletionResult,
} from './aiProvider.interface';
import { logger } from '../../../config/logger';

export class OpenAIProvider implements AIProvider {
  public id = 'openai';
  public name = 'OpenAI Compatible Provider';
  private apiKey?: string;
  private baseUrl: string;
  private defaultModel = 'gpt-4o-mini';

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = (baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  public async generateCompletion(
    prompt: string | AIChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error('OpenAIProvider: OPENAI_API_KEY is not configured.');
    }

    const model = options.model || this.defaultModel;
    const messages: any[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt });
    } else {
      messages.push(...prompt);
    }

    const body: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey || 'dummy'}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as any;
      const choice = json.choices?.[0];
      const content = choice?.message?.content || '';
      const promptTokens = json.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
      const completionTokens = json.usage?.completion_tokens || Math.ceil(content.length / 4);

      return {
        content,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
        finishReason: choice?.finish_reason,
      };
    } catch (err: any) {
      logger.error({ err: err.message, model }, 'OpenAI API completion error');
      throw err;
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey || 'dummy'}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embedding error: HTTP ${response.status}`);
      }

      const json = (await response.json()) as any;
      return json.data?.[0]?.embedding || [];
    } catch (err: any) {
      logger.error({ err: err.message }, 'OpenAI Embedding error');
      throw err;
    }
  }
}
