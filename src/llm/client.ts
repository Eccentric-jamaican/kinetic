/**
 * OpenRouter LLM Client
 * Handles communication with OpenRouter API for animation generation
 */

import { validateDSL } from '@/dsl/validator';
import type { KineticAnimation } from '@/dsl/schema';
import { SYSTEM_PROMPT, REFINEMENT_PROMPT, ERROR_RECOVERY_PROMPT } from './prompts';

// ============================================================
// TYPES
// ============================================================

export type GenerationResult =
  | { success: true; dsl: KineticAnimation; raw: string }
  | { success: false; error: string; raw: string };

export type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  pricing?: { prompt: string; completion: string };
};

// Free models on OpenRouter
export const FREE_MODELS = [
  { id: 'nex-agi/deepseek-v3.1-nex-n1:free', name: 'DeepSeek V3.1 Nex N1 (Free)' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
];

export const DEFAULT_MODEL = 'nex-agi/deepseek-v3.1-nex-n1:free';

// ============================================================
// CLIENT CLASS
// ============================================================

export class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private conversationHistory: ConversationMessage[] = [];

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Generate animation from prompt
   */
  async generateAnimation(prompt: string): Promise<GenerationResult> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    const response = await this.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.conversationHistory,
    ]);

    if (!response.success) {
      return response;
    }

    this.conversationHistory.push({ role: 'assistant', content: response.raw });
    return response;
  }

  /**
   * Refine existing animation
   */
  async refineAnimation(
    currentDsl: KineticAnimation,
    refinement: string
  ): Promise<GenerationResult> {
    const prompt = REFINEMENT_PROMPT
      .replace('{CURRENT_DSL}', JSON.stringify(currentDsl, null, 2))
      .replace('{USER_REQUEST}', refinement);

    this.conversationHistory.push({ role: 'user', content: refinement });

    const response = await this.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    if (!response.success) {
      return response;
    }

    this.conversationHistory.push({ role: 'assistant', content: response.raw });
    return response;
  }

  /**
   * Attempt to recover from validation errors
   */
  async recoverFromErrors(
    dsl: string,
    errors: string[]
  ): Promise<GenerationResult> {
    const prompt = ERROR_RECOVERY_PROMPT
      .replace('{DSL}', dsl)
      .replace('{ERRORS}', errors.join('\n'));

    return this.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);
  }

  /**
   * Core chat method
   */
  private async chat(
    messages: ConversationMessage[]
  ): Promise<GenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kinetic.dev',
          'X-Title': 'Kinetic Animation Generator',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API Error (${response.status}): ${errorText}`,
          raw: '',
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: 'No content in response',
          raw: '',
        };
      }

      return this.parseResponse(content);
    } catch (error) {
      return {
        success: false,
        error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        raw: '',
      };
    }
  }

  /**
   * Parse LLM response and extract DSL
   */
  private parseResponse(content: string): GenerationResult {
    // Extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);

    if (!jsonMatch) {
      // Try to find raw JSON
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        return {
          success: false,
          error: 'No JSON found in response',
          raw: content,
        };
      }

      const jsonStr = content.slice(jsonStart, jsonEnd + 1);
      return this.validateAndReturn(jsonStr, content);
    }

    return this.validateAndReturn(jsonMatch[1].trim(), content);
  }

  /**
   * Validate JSON and return result
   */
  private validateAndReturn(jsonStr: string, raw: string): GenerationResult {
    try {
      const parsed = JSON.parse(jsonStr);
      const validation = validateDSL(parsed);

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation errors:\n${validation.errors.map((e) => `- ${e.path}: ${e.message}`).join('\n')}`,
          raw,
        };
      }

      return {
        success: true,
        dsl: validation.data,
        raw,
      };
    } catch (e) {
      return {
        success: false,
        error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        raw,
      };
    }
  }
}

// ============================================================
// FACTORY & UTILITIES
// ============================================================

let clientInstance: OpenRouterClient | null = null;

/**
 * Get or create the OpenRouter client instance
 */
export function getOpenRouterClient(apiKey?: string): OpenRouterClient | null {
  if (apiKey) {
    clientInstance = new OpenRouterClient(apiKey);
  }
  return clientInstance;
}

/**
 * Create a new OpenRouter client
 */
export function createOpenRouterClient(
  apiKey: string,
  model?: string
): OpenRouterClient {
  return new OpenRouterClient(apiKey, model);
}

/**
 * Check if API key is valid (basic format check)
 */
export function isValidApiKey(key: string): boolean {
  return key.startsWith('sk-or-') && key.length > 20;
}
