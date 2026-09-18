export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AIToolDefinition[];
  responseFormat?: 'text' | 'json';
}

export interface AIToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface AICompletionResult {
  content: string;
  toolCalls?: AIToolCall[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  finishReason?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  generateCompletion(
    prompt: string | AIChatMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;
  generateEmbedding(text: string): Promise<number[]>;
}
