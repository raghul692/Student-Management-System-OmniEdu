import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  AIChatMessage,
  AICompletionOptions,
  AICompletionResult,
} from './aiProvider.interface';
import { logger } from '../../../config/logger';

export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini Provider';
  private client: GoogleGenAI | null = null;
  private defaultModel = 'gemini-2.5-flash';
  private embeddingModel = 'gemini-embedding-001';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.client = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        logger.warn({ err }, 'Failed to initialize GoogleGenAI client');
      }
    }
  }

  public async generateCompletion(
    prompt: string | AIChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const model = options.model || this.defaultModel;

    if (!this.client) {
      throw new Error('GeminiProvider: GEMINI_API_KEY is not configured.');
    }

    let contents: any;
    if (typeof prompt === 'string') {
      contents = prompt;
    } else {
      // Map chat messages to Gemini content format
      contents = prompt.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
    }

    try {
      const response = await this.client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens ?? 2048,
          responseMimeType: options.responseFormat === 'json' ? 'application/json' : undefined,
        },
      });

      const text = response.text || '';
      const promptTokens = Math.ceil(JSON.stringify(contents).length / 4);
      const completionTokens = Math.ceil(text.length / 4);

      return {
        content: text,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
      };
    } catch (err: any) {
      logger.error({ err: err.message, model }, 'Gemini API completion error');
      throw err;
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('GeminiProvider: GEMINI_API_KEY is not configured for embeddings.');
    }

    try {
      const res = await this.client.models.embedContent({
        model: this.embeddingModel,
        contents: text,
      });

      // Extract vector values
      const embeddingValues = (res as any).embedding?.values || (res as any).values || [];
      return embeddingValues;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Gemini Embedding generation error');
      throw err;
    }
  }
}
