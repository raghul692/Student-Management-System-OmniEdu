import {
  AIProvider,
  AIChatMessage,
  AICompletionOptions,
  AICompletionResult,
} from './aiProvider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { LocalHeuristicProvider } from './local-heuristic.provider';
import { logger } from '../../../config/logger';

export class ResilientFallbackProvider implements AIProvider {
  public id: string;
  public name: string;
  private primary: AIProvider;
  private secondary?: AIProvider;
  private local: LocalHeuristicProvider;

  constructor(primary: AIProvider, secondary?: AIProvider) {
    this.primary = primary;
    this.secondary = secondary;
    this.local = new LocalHeuristicProvider();
    this.id = primary.id;
    this.name = `${primary.name} (with resilient fallback)`;
  }

  public async generateCompletion(
    prompt: string | AIChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    try {
      return await this.primary.generateCompletion(prompt, options);
    } catch (primaryErr: any) {
      logger.warn(
        { err: primaryErr.message, primary: this.primary.id },
        `Primary AI provider (${this.primary.id}) failed, initiating fallback cascade`
      );

      if (this.secondary) {
        try {
          logger.info(`Fallback cascade: Attempting secondary provider (${this.secondary.id})`);
          return await this.secondary.generateCompletion(prompt, options);
        } catch (secondaryErr: any) {
          logger.warn(
            { err: secondaryErr.message, secondary: this.secondary.id },
            `Secondary AI provider (${this.secondary.id}) failed, falling back to local heuristic`
          );
        }
      }

      logger.info('Fallback cascade: Engaging Local Heuristic Engine');
      return await this.local.generateCompletion(prompt, options);
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.primary.generateEmbedding(text);
    } catch (primaryErr: any) {
      logger.warn(
        { err: primaryErr.message, primary: this.primary.id },
        `Primary embedding generator failed, initiating fallback cascade`
      );

      if (this.secondary) {
        try {
          return await this.secondary.generateEmbedding(text);
        } catch (secondaryErr: any) {
          logger.warn(
            { err: secondaryErr.message },
            `Secondary embedding generator failed, falling back to local`
          );
        }
      }

      return await this.local.generateEmbedding(text);
    }
  }
}

export class AIProviderFactory {
  private static instance: AIProvider | null = null;

  public static getProvider(): AIProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = (process.env.AI_PROVIDER || 'local').toLowerCase();

    if (providerType === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
        const secondary = process.env.OPENAI_API_KEY
          ? new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_BASE_URL)
          : undefined;
        this.instance = new ResilientFallbackProvider(gemini, secondary);
        logger.info('AI Provider initialized: Google Gemini with Resilient Fallback');
        return this.instance;
      } catch (err) {
        logger.warn('Failed to initialize GeminiProvider, falling back to Local Heuristic');
      }
    }

    if (providerType === 'openai' && (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL)) {
      try {
        const openai = new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_BASE_URL);
        this.instance = new ResilientFallbackProvider(openai);
        logger.info('AI Provider initialized: OpenAI Compatible with Resilient Fallback');
        return this.instance;
      } catch (err) {
        logger.warn('Failed to initialize OpenAIProvider, falling back to Local Heuristic');
      }
    }

    this.instance = new LocalHeuristicProvider();
    logger.info('AI Provider initialized: Local Heuristic Engine');
    return this.instance;
  }

  /**
   * Reset instance (useful for unit tests)
   */
  public static reset() {
    this.instance = null;
  }
}

export const getAIProvider = () => AIProviderFactory.getProvider();
