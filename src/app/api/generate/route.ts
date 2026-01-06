import { NextRequest, NextResponse } from 'next/server';
import { validateDSL } from '@/dsl/validator';
import {
  ANIMATOR_PROMPT,
  CRITIC_PROMPT,
  REFINER_PROMPT,
  REFINEMENT_PROMPT,
  ERROR_RECOVERY_PROMPT,
} from '@/llm/prompts';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Multi-agent model configuration
const AGENT_MODELS = {
  animator: 'deepseek/deepseek-chat-v3-0324:free',  // Creative generation, complex instructions
  critic: 'nex-agi/deepseek-v3.1-nex-n1:free',     // Analytical evaluation
  refiner: 'mistralai/devstral-2512:free',         // Code-focused, precise JSON edits
} as const;

type AgentRole = keyof typeof AGENT_MODELS;

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type GenerateRequest = {
  type: 'generate' | 'refine' | 'recover';
  prompt?: string;
  currentDsl?: object;
  dsl?: string;
  errors?: string[];
  conversationHistory?: Message[];
  multiAgent?: boolean; // Enable multi-agent pipeline
};

type AgentResponse = {
  content: string;
  success: boolean;
};

// ============================================================
// LLM API CALL
// ============================================================

async function callLLM(
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<AgentResponse> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kinetic.dev',
      'X-Title': 'Kinetic Animation Generator',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { content: `API Error: ${errorText}`, success: false };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { content: 'No content in response', success: false };
  }

  return { content, success: true };
}

// ============================================================
// MULTI-AGENT PIPELINE
// ============================================================

async function runMultiAgentPipeline(
  apiKey: string,
  _fallbackModel: string,
  userPrompt: string
): Promise<{ success: boolean; dsl?: object; raw: string; stages?: object }> {
  const stages: Record<string, unknown> = {};

  // Stage 1: Animator generates initial DSL (GPT-OSS-120B for creative generation)
  console.log(`[Multi-Agent] Stage 1: Animator (${AGENT_MODELS.animator})`);
  const animatorResponse = await callLLM(apiKey, AGENT_MODELS.animator, [
    { role: 'system', content: ANIMATOR_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  if (!animatorResponse.success) {
    return { success: false, raw: animatorResponse.content };
  }

  const initialDsl = extractJson(animatorResponse.content);
  if (!initialDsl) {
    return {
      success: false,
      raw: animatorResponse.content,
      stages: { animator: 'Failed to extract JSON' },
    };
  }

  stages.animator = { raw: animatorResponse.content.slice(0, 200) + '...' };

  // Validate initial DSL
  const initialValidation = validateDSL(initialDsl);
  if (!initialValidation.valid) {
    // Try error recovery before proceeding (use animator model for recovery)
    const recoveryPrompt = ERROR_RECOVERY_PROMPT
      .replace('{DSL}', JSON.stringify(initialDsl, null, 2))
      .replace('{ERRORS}', initialValidation.errors.map(e => `${e.path}: ${e.message}`).join('\n'));

    const recoveryResponse = await callLLM(apiKey, AGENT_MODELS.animator, [
      { role: 'system', content: ANIMATOR_PROMPT },
      { role: 'user', content: recoveryPrompt },
    ]);

    if (recoveryResponse.success) {
      const recoveredDsl = extractJson(recoveryResponse.content);
      if (recoveredDsl) {
        const recoveredValidation = validateDSL(recoveredDsl);
        if (recoveredValidation.valid) {
          // Continue with recovered DSL
          return runCritiqueAndRefine(apiKey, '', recoveredDsl, userPrompt, stages);
        }
      }
    }

    // If recovery failed, return the validation errors
    return {
      success: false,
      raw: animatorResponse.content,
      stages: { ...stages, error: initialValidation.errors },
    };
  }

  // Stage 2 & 3: Critique and Refine
  return runCritiqueAndRefine(apiKey, '', initialDsl, userPrompt, stages);
}

async function runCritiqueAndRefine(
  apiKey: string,
  _fallbackModel: string,
  dsl: object,
  userPrompt: string,
  stages: Record<string, unknown>
): Promise<{ success: boolean; dsl?: object; raw: string; stages?: object }> {
  // Stage 2: Critic reviews the animation (DeepSeek for analytical evaluation)
  console.log(`[Multi-Agent] Stage 2: Critic (${AGENT_MODELS.critic})`);
  const criticResponse = await callLLM(apiKey, AGENT_MODELS.critic, [
    { role: 'system', content: CRITIC_PROMPT },
    {
      role: 'user',
      content: `Review this animation DSL for quality:

User's original request: "${userPrompt}"

DSL to review:
\`\`\`json
${JSON.stringify(dsl, null, 2)}
\`\`\`

Provide your critique.`,
    },
  ]);

  if (!criticResponse.success) {
    // If critic fails, return the initial DSL (it's still valid)
    const validation = validateDSL(dsl);
    return {
      success: validation.valid,
      dsl: validation.valid ? validation.data : undefined,
      raw: JSON.stringify(dsl, null, 2),
      stages,
    };
  }

  stages.critic = extractCritique(criticResponse.content);

  // Stage 3: Refiner applies improvements (Devstral for precise JSON edits)
  console.log(`[Multi-Agent] Stage 3: Refiner (${AGENT_MODELS.refiner})`);
  const refinerResponse = await callLLM(apiKey, AGENT_MODELS.refiner, [
    { role: 'system', content: REFINER_PROMPT },
    {
      role: 'user',
      content: `Apply these improvements to the animation:

Original DSL:
\`\`\`json
${JSON.stringify(dsl, null, 2)}
\`\`\`

Critic's feedback:
${criticResponse.content}

Return the improved DSL.`,
    },
  ]);

  if (!refinerResponse.success) {
    // If refiner fails, return the initial DSL
    const validation = validateDSL(dsl);
    return {
      success: validation.valid,
      dsl: validation.valid ? validation.data : undefined,
      raw: JSON.stringify(dsl, null, 2),
      stages,
    };
  }

  const refinedDsl = extractJson(refinerResponse.content);
  if (!refinedDsl) {
    // If we can't extract refined DSL, return initial
    const validation = validateDSL(dsl);
    return {
      success: validation.valid,
      dsl: validation.valid ? validation.data : undefined,
      raw: JSON.stringify(dsl, null, 2),
      stages: { ...stages, refiner: 'Failed to extract JSON' },
    };
  }

  stages.refiner = { improved: true };

  // Validate refined DSL
  const refinedValidation = validateDSL(refinedDsl);
  if (!refinedValidation.valid) {
    // If refined DSL is invalid, fall back to initial
    const initialValidation = validateDSL(dsl);
    return {
      success: initialValidation.valid,
      dsl: initialValidation.valid ? initialValidation.data : undefined,
      raw: JSON.stringify(dsl, null, 2),
      stages: { ...stages, refinerError: refinedValidation.errors },
    };
  }

  return {
    success: true,
    dsl: refinedValidation.data,
    raw: JSON.stringify(refinedDsl, null, 2),
    stages,
  };
}

function extractCritique(content: string): object {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to extract just the score
    const scoreMatch = content.match(/"score":\s*(\d+)/);
    return { score: scoreMatch ? parseInt(scoreMatch[1]) : null, raw: content.slice(0, 300) };
  } catch {
    return { raw: content.slice(0, 300) };
  }
}

function extractJson(content: string): object | null {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try raw JSON
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(content.slice(start, end + 1));
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'nex-agi/deepseek-v3.1-nex-n1:free';

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenRouter API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body: GenerateRequest = await request.json();

    // Use multi-agent pipeline for generate requests
    if (body.type === 'generate' && body.multiAgent !== false) {
      const result = await runMultiAgentPipeline(apiKey, model, body.prompt || '');
      return NextResponse.json(result);
    }

    // Single-agent flow for other request types
    let messages: Message[] = [];

    switch (body.type) {
      case 'generate':
        messages = [
          { role: 'system', content: ANIMATOR_PROMPT },
          ...(body.conversationHistory || []),
          { role: 'user', content: body.prompt || '' },
        ];
        break;

      case 'refine':
        const refinementPrompt = REFINEMENT_PROMPT
          .replace('{CURRENT_DSL}', JSON.stringify(body.currentDsl, null, 2))
          .replace('{USER_REQUEST}', body.prompt || '');
        messages = [
          { role: 'system', content: ANIMATOR_PROMPT },
          { role: 'user', content: refinementPrompt },
        ];
        break;

      case 'recover':
        const recoveryPrompt = ERROR_RECOVERY_PROMPT
          .replace('{DSL}', body.dsl || '')
          .replace('{ERRORS}', (body.errors || []).join('\n'));
        messages = [
          { role: 'system', content: ANIMATOR_PROMPT },
          { role: 'user', content: recoveryPrompt },
        ];
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid request type' },
          { status: 400 }
        );
    }

    const response = await callLLM(apiKey, model, messages);

    if (!response.success) {
      return NextResponse.json(
        { success: false, error: response.content, raw: '' },
        { status: 500 }
      );
    }

    const result = parseResponse(response.content);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        raw: '',
      },
      { status: 500 }
    );
  }
}

function parseResponse(content: string) {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);

  if (!jsonMatch) {
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
    return validateAndReturn(jsonStr, content);
  }

  return validateAndReturn(jsonMatch[1].trim(), content);
}

function validateAndReturn(jsonStr: string, raw: string) {
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
