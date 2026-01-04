/**
 * Kinetic DSL Parser
 * Parses and resolves variables/expressions in the DSL
 */

import type {
  KineticAnimation,
  ElementDefinition,
  ElementState,
  AnimationBlock,
  SequenceDefinition,
  TimelineDefinition,
  NumberOrExpression,
  VariableValue,
  SpringConfig,
  SpringPreset,
} from './schema';
import { validateDSL, isExpression, extractVariables } from './validator';

// ============================================================
// TYPES
// ============================================================

export type ParsedAnimation = {
  meta: KineticAnimation['meta'];
  elements: Record<string, ResolvedElement>;
  timeline: ResolvedTimeline;
  audio: KineticAnimation['audio'];
  stateMachine: KineticAnimation['stateMachine'];
  dataBinding: KineticAnimation['dataBinding'];
  raw: KineticAnimation;
};

export type ResolvedElement = Omit<ElementDefinition, 'initial'> & {
  initial: ResolvedElementState;
};

export type ResolvedElementState = {
  [K in keyof ElementState]: ElementState[K] extends NumberOrExpression | undefined
    ? number | undefined
    : ElementState[K];
};

export type ResolvedTimeline = Omit<TimelineDefinition, 'sequences'> & {
  sequences: ResolvedSequence[];
};

export type ResolvedSequence = Omit<SequenceDefinition, 'animations'> & {
  animations: ResolvedAnimationBlock[];
};

export type ResolvedAnimationBlock = AnimationBlock & {
  _resolved?: boolean;
};

export type ParseError = {
  type: 'validation' | 'variable' | 'expression';
  message: string;
  path?: string;
};

export type ParseResult =
  | { success: true; animation: ParsedAnimation; errors: [] }
  | { success: false; animation: null; errors: ParseError[] };

// ============================================================
// SPRING PRESETS
// ============================================================

export const SPRING_PRESETS: Record<
  SpringPreset,
  { stiffness: number; damping: number; mass: number }
> = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 210, damping: 20, mass: 1 },
  slow: { stiffness: 280, damping: 60, mass: 1 },
  molasses: { stiffness: 280, damping: 120, mass: 1 },
  bouncy: { stiffness: 400, damping: 10, mass: 1 },
};

// ============================================================
// PARSER CLASS
// ============================================================

export class DSLParser {
  private variables: Record<string, VariableValue> = {};
  private errors: ParseError[] = [];

  /**
   * Parse a DSL object
   */
  parse(input: unknown): ParseResult {
    this.errors = [];

    // Validate first
    const validation = validateDSL(input);
    if (!validation.valid) {
      return {
        success: false,
        animation: null,
        errors: validation.errors.map((e) => ({
          type: 'validation' as const,
          message: e.message,
          path: e.path,
        })),
      };
    }

    const dsl = validation.data;
    this.variables = dsl.variables || {};

    try {
      const parsed: ParsedAnimation = {
        meta: dsl.meta,
        elements: this.parseElements(dsl.elements),
        timeline: this.parseTimeline(dsl.timeline),
        audio: dsl.audio,
        stateMachine: dsl.stateMachine,
        dataBinding: dsl.dataBinding,
        raw: dsl,
      };

      if (this.errors.length > 0) {
        return {
          success: false,
          animation: null,
          errors: this.errors,
        };
      }

      return {
        success: true,
        animation: parsed,
        errors: [],
      };
    } catch (e) {
      return {
        success: false,
        animation: null,
        errors: [
          {
            type: 'expression',
            message: e instanceof Error ? e.message : 'Unknown parsing error',
          },
        ],
      };
    }
  }

  /**
   * Parse a JSON string
   */
  parseString(jsonString: string): ParseResult {
    try {
      const parsed = JSON.parse(jsonString);
      return this.parse(parsed);
    } catch (e) {
      return {
        success: false,
        animation: null,
        errors: [
          {
            type: 'validation',
            message: `JSON Parse Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  // ============================================================
  // ELEMENT PARSING
  // ============================================================

  private parseElements(
    elements: Record<string, ElementDefinition>
  ): Record<string, ResolvedElement> {
    const resolved: Record<string, ResolvedElement> = {};

    for (const [id, element] of Object.entries(elements)) {
      resolved[id] = this.parseElement(element, id);
    }

    return resolved;
  }

  private parseElement(element: ElementDefinition, id: string): ResolvedElement {
    return {
      ...element,
      initial: this.resolveElementState(element.initial, `elements.${id}.initial`),
    } as ResolvedElement;
  }

  private resolveElementState(
    state: ElementState,
    path: string
  ): ResolvedElementState {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(state)) {
      if (value === undefined) continue;

      if (this.isNumberOrExpression(value)) {
        resolved[key] = this.resolveNumberOrExpression(value, `${path}.${key}`);
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects like pathMotion, boxShadow
        resolved[key] = this.resolveNestedObject(value, `${path}.${key}`);
      } else {
        resolved[key] = value;
      }
    }

    return resolved as ResolvedElementState;
  }

  private resolveNestedObject(obj: object, path: string): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item, i) =>
        typeof item === 'object' && item !== null
          ? this.resolveNestedObject(item, `${path}[${i}]`)
          : this.isNumberOrExpression(item)
            ? this.resolveNumberOrExpression(item, `${path}[${i}]`)
            : item
      );
    }

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isNumberOrExpression(value)) {
        resolved[key] = this.resolveNumberOrExpression(value, `${path}.${key}`);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveNestedObject(value, `${path}.${key}`);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  // ============================================================
  // TIMELINE PARSING
  // ============================================================

  private parseTimeline(timeline: TimelineDefinition): ResolvedTimeline {
    return {
      ...timeline,
      sequences: timeline.sequences.map((seq, i) =>
        this.parseSequence(seq, `timeline.sequences[${i}]`)
      ),
    };
  }

  private parseSequence(
    sequence: SequenceDefinition,
    path: string
  ): ResolvedSequence {
    return {
      ...sequence,
      animations: sequence.animations.map((anim, i) =>
        this.parseAnimationBlock(anim, `${path}.animations[${i}]`)
      ),
    };
  }

  private parseAnimationBlock(
    block: AnimationBlock,
    path: string
  ): ResolvedAnimationBlock {
    switch (block.type) {
      case 'spring':
        return {
          ...block,
          spring: this.resolveSpringConfig(block.spring, `${path}.spring`),
          from: block.from
            ? this.resolveElementState(block.from, `${path}.from`)
            : undefined,
          to: this.resolveElementState(block.to, `${path}.to`),
          _resolved: true,
        } as ResolvedAnimationBlock;

      case 'transition':
        return {
          ...block,
          from: block.from
            ? this.resolveElementState(block.from, `${path}.from`)
            : undefined,
          to: this.resolveElementState(block.to, `${path}.to`),
          _resolved: true,
        } as ResolvedAnimationBlock;

      case 'keyframes':
        return {
          ...block,
          keyframes: block.keyframes.map((kf, i) => ({
            ...kf,
            state: this.resolveElementState(
              kf.state,
              `${path}.keyframes[${i}].state`
            ),
          })),
          _resolved: true,
        } as ResolvedAnimationBlock;

      case 'group':
        return {
          ...block,
          animations: block.animations.map((anim, i) =>
            this.parseAnimationBlock(anim, `${path}.animations[${i}]`)
          ),
          _resolved: true,
        } as ResolvedAnimationBlock;

      default:
        return { ...block, _resolved: true } as ResolvedAnimationBlock;
    }
  }

  private resolveSpringConfig(
    config: SpringConfig,
    path: string
  ): SpringConfig {
    // If using preset, expand it
    if (config.preset) {
      const preset = SPRING_PRESETS[config.preset];
      return {
        stiffness: config.stiffness ?? preset.stiffness,
        damping: config.damping ?? preset.damping,
        mass: config.mass ?? preset.mass,
        velocity: config.velocity,
        restDelta: config.restDelta,
        restSpeed: config.restSpeed,
      };
    }

    return config;
  }

  // ============================================================
  // EXPRESSION RESOLUTION
  // ============================================================

  private isNumberOrExpression(value: unknown): value is NumberOrExpression {
    return typeof value === 'number' || isExpression(value);
  }

  private resolveNumberOrExpression(
    value: NumberOrExpression,
    path: string
  ): number {
    if (typeof value === 'number') {
      return value;
    }

    return this.evaluateExpression(value, path);
  }

  private evaluateExpression(expression: string, path: string): number {
    // Handle simple variable reference: $variableName
    if (expression.startsWith('$') && !expression.startsWith('${')) {
      const varName = expression.slice(1);
      const resolved = this.getVariable(varName, path);
      if (typeof resolved !== 'number') {
        this.errors.push({
          type: 'expression',
          message: `Variable "${varName}" is not a number at ${path}`,
          path,
        });
        return 0;
      }
      return resolved;
    }

    // Handle expression: ${expression}
    if (expression.startsWith('${') && expression.endsWith('}')) {
      const expr = expression.slice(2, -1);
      return this.evaluateComplexExpression(expr, path);
    }

    this.errors.push({
      type: 'expression',
      message: `Invalid expression format: ${expression} at ${path}`,
      path,
    });
    return 0;
  }

  private evaluateComplexExpression(expr: string, path: string): number {
    // Replace variable references with their values
    const variables = extractVariables(expr);
    let resolved = expr;

    for (const varName of variables) {
      const value = this.getVariable(varName, path);
      if (value === undefined) {
        this.errors.push({
          type: 'variable',
          message: `Unknown variable: ${varName} at ${path}`,
          path,
        });
        return 0;
      }
      resolved = resolved.replace(new RegExp(`\\$${varName}`, 'g'), String(value));
    }

    // Safe evaluation - only allow basic math operations
    try {
      // Sanitize: only allow numbers, operators, parentheses, spaces, and decimal points
      const sanitized = resolved.replace(/[^0-9+\-*/.() ]/g, '');
      if (sanitized !== resolved.replace(/\s/g, '').replace(/\s/g, '')) {
        // The original had characters we don't allow
        this.errors.push({
          type: 'expression',
          message: `Expression contains invalid characters: ${expr} at ${path}`,
          path,
        });
        return 0;
      }

      // Use Function constructor for safe-ish evaluation
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();

      if (typeof result !== 'number' || isNaN(result)) {
        this.errors.push({
          type: 'expression',
          message: `Expression did not evaluate to a number: ${expr} at ${path}`,
          path,
        });
        return 0;
      }

      return result;
    } catch (e) {
      this.errors.push({
        type: 'expression',
        message: `Expression evaluation failed: ${expr} - ${e instanceof Error ? e.message : 'Unknown error'} at ${path}`,
        path,
      });
      return 0;
    }
  }

  private getVariable(name: string, path: string): VariableValue | undefined {
    // Support dot notation for nested access
    const parts = name.split('.');
    let current: unknown = this.variables;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as VariableValue | undefined;
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Create a parser instance and parse DSL
 */
export function parseDSL(input: unknown): ParseResult {
  const parser = new DSLParser();
  return parser.parse(input);
}

/**
 * Create a parser instance and parse DSL string
 */
export function parseDSLString(jsonString: string): ParseResult {
  const parser = new DSLParser();
  return parser.parseString(jsonString);
}

/**
 * Get all element IDs from a DSL
 */
export function getElementIds(dsl: KineticAnimation): string[] {
  return Object.keys(dsl.elements);
}

/**
 * Get all sequence IDs from a DSL
 */
export function getSequenceIds(dsl: KineticAnimation): string[] {
  return dsl.timeline.sequences
    .map((seq) => seq.id)
    .filter((id): id is string => id !== undefined);
}

/**
 * Get all variable names from a DSL
 */
export function getVariableNames(dsl: KineticAnimation): string[] {
  return Object.keys(dsl.variables || {});
}

/**
 * Deep clone a DSL object
 */
export function cloneDSL(dsl: KineticAnimation): KineticAnimation {
  return JSON.parse(JSON.stringify(dsl));
}

/**
 * Merge two DSL objects (second overrides first)
 */
export function mergeDSL(
  base: KineticAnimation,
  override: Partial<KineticAnimation>
): KineticAnimation {
  return {
    ...base,
    ...override,
    meta: { ...base.meta, ...override.meta },
    variables: { ...base.variables, ...override.variables },
    elements: { ...base.elements, ...override.elements },
    timeline: override.timeline || base.timeline,
  };
}

/**
 * Create a minimal valid DSL
 */
export function createEmptyDSL(): KineticAnimation {
  return {
    version: '1.0',
    meta: { name: 'Untitled' },
    elements: {},
    timeline: { sequences: [] },
  };
}

/**
 * Add an element to a DSL
 */
export function addElement(
  dsl: KineticAnimation,
  id: string,
  element: ElementDefinition
): KineticAnimation {
  return {
    ...dsl,
    elements: {
      ...dsl.elements,
      [id]: element,
    },
  };
}

/**
 * Remove an element from a DSL
 */
export function removeElement(
  dsl: KineticAnimation,
  id: string
): KineticAnimation {
  const { [id]: _, ...rest } = dsl.elements;
  return {
    ...dsl,
    elements: rest,
  };
}

/**
 * Add a sequence to a DSL
 */
export function addSequence(
  dsl: KineticAnimation,
  sequence: SequenceDefinition
): KineticAnimation {
  return {
    ...dsl,
    timeline: {
      ...dsl.timeline,
      sequences: [...dsl.timeline.sequences, sequence],
    },
  };
}

export { DSLParser };
