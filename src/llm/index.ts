/**
 * LLM Module
 */

export {
  OpenRouterClient,
  getOpenRouterClient,
  createOpenRouterClient,
  isValidApiKey,
  FREE_MODELS,
  DEFAULT_MODEL,
} from './client';

export type {
  GenerationResult,
  ConversationMessage,
  OpenRouterModel,
} from './client';

export {
  SYSTEM_PROMPT,
  REFINEMENT_PROMPT,
  ERROR_RECOVERY_PROMPT,
} from './prompts';
