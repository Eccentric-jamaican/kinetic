import { NextRequest, NextResponse } from 'next/server';
import { validateDSL } from '@/dsl/validator';
import { SYSTEM_PROMPT, REFINEMENT_PROMPT, ERROR_RECOVERY_PROMPT } from '@/llm/prompts';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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
};

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
    let messages: Message[] = [];

    switch (body.type) {
      case 'generate':
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(body.conversationHistory || []),
          { role: 'user', content: body.prompt || '' },
        ];
        break;

      case 'refine':
        const refinementPrompt = REFINEMENT_PROMPT
          .replace('{CURRENT_DSL}', JSON.stringify(body.currentDsl, null, 2))
          .replace('{USER_REQUEST}', body.prompt || '');
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: refinementPrompt },
        ];
        break;

      case 'recover':
        const recoveryPrompt = ERROR_RECOVERY_PROMPT
          .replace('{DSL}', body.dsl || '')
          .replace('{ERRORS}', (body.errors || []).join('\n'));
        messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: recoveryPrompt },
        ];
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid request type' },
          { status: 400 }
        );
    }

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
      return NextResponse.json(
        { success: false, error: `API Error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content in response', raw: '' },
        { status: 500 }
      );
    }

    // Parse response and extract DSL
    const result = parseResponse(content);
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
