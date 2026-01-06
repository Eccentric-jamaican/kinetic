/**
 * Kinetic DSL Validator
 * Uses Zod for runtime validation of DSL JSON
 */

import { z } from 'zod';
import type { KineticAnimation } from './schema';

// ============================================================
// PRIMITIVE SCHEMAS
// ============================================================

const NumberOrExpressionSchema = z.union([
  z.number(),
  z.string().regex(/^\$[\w.]+$|^\$\{.+\}$/),
]);

const ColorValueSchema = z.string();

// ============================================================
// EASING SCHEMAS
// ============================================================

const EasingPresetSchema = z.enum([
  'linear',
  'ease',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInQuart',
  'easeOutQuart',
  'easeInOutQuart',
  'easeInQuint',
  'easeOutQuint',
  'easeInOutQuint',
  'easeInExpo',
  'easeOutExpo',
  'easeInOutExpo',
  'easeInCirc',
  'easeOutCirc',
  'easeInOutCirc',
  'easeInBack',
  'easeOutBack',
  'easeInOutBack',
  'easeInElastic',
  'easeOutElastic',
  'easeInOutElastic',
  'easeInBounce',
  'easeOutBounce',
  'easeInOutBounce',
]);

const CubicBezierEasingSchema = z.object({
  type: z.literal('cubicBezier'),
  values: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

const StepsEasingSchema = z.object({
  type: z.literal('steps'),
  count: z.number().int().positive(),
  position: z.enum(['start', 'end', 'both', 'none']).optional(),
});

const SpringPresetSchema = z.enum([
  'gentle',
  'wobbly',
  'stiff',
  'slow',
  'molasses',
  'bouncy',
]);

const SpringConfigSchema = z
  .object({
    stiffness: z.number().optional(),
    damping: z.number().optional(),
    mass: z.number().optional(),
    velocity: z.number().optional(),
    restDelta: z.number().optional(),
    restSpeed: z.number().optional(),
    preset: SpringPresetSchema.optional(),
    duration: z.number().optional(),
    bounce: z.number().min(0).max(1).optional(),
  })
  .refine(
    (data) =>
      data.preset !== undefined ||
      data.stiffness !== undefined ||
      data.duration !== undefined,
    { message: 'Spring must have preset, stiffness, or duration' }
  );

const SpringEasingSchema = z.object({
  type: z.literal('spring'),
  config: SpringConfigSchema,
});

const EasingDefinitionSchema = z.union([
  EasingPresetSchema,
  CubicBezierEasingSchema,
  StepsEasingSchema,
  SpringEasingSchema,
]);

// ============================================================
// STAGGER & REPEAT SCHEMAS
// ============================================================

const StaggerDefinitionSchema = z.object({
  each: z.number(),
  from: z
    .union([
      z.enum(['first', 'last', 'center', 'edges']),
      z.number().int().nonnegative(),
    ])
    .optional(),
  grid: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  axis: z.enum(['x', 'y']).optional(),
  ease: EasingDefinitionSchema.optional(),
});

const RepeatDefinitionSchema = z.object({
  count: z.union([z.number().int().positive(), z.literal('infinite')]),
  delay: z.number().optional(),
  behavior: z.enum(['loop', 'reverse']).optional(),
});

// ============================================================
// SHADOW SCHEMA
// ============================================================

const ShadowDefinitionSchema = z.object({
  x: NumberOrExpressionSchema,
  y: NumberOrExpressionSchema,
  blur: NumberOrExpressionSchema,
  spread: NumberOrExpressionSchema.optional(),
  color: ColorValueSchema,
  inset: z.boolean().optional(),
});

// ============================================================
// ELEMENT STATE SCHEMA
// ============================================================

const ElementStateSchema = z.object({
  // Transform
  x: NumberOrExpressionSchema.optional(),
  y: NumberOrExpressionSchema.optional(),
  z: NumberOrExpressionSchema.optional(),
  scaleX: NumberOrExpressionSchema.optional(),
  scaleY: NumberOrExpressionSchema.optional(),
  scale: NumberOrExpressionSchema.optional(),
  rotateX: NumberOrExpressionSchema.optional(),
  rotateY: NumberOrExpressionSchema.optional(),
  rotateZ: NumberOrExpressionSchema.optional(),
  rotate: NumberOrExpressionSchema.optional(),
  skewX: NumberOrExpressionSchema.optional(),
  skewY: NumberOrExpressionSchema.optional(),
  originX: NumberOrExpressionSchema.optional(),
  originY: NumberOrExpressionSchema.optional(),

  // Visual
  opacity: NumberOrExpressionSchema.optional(),
  backgroundColor: ColorValueSchema.optional(),
  borderColor: ColorValueSchema.optional(),
  color: ColorValueSchema.optional(),
  fill: ColorValueSchema.optional(),
  stroke: ColorValueSchema.optional(),

  // Dimensions
  width: z.union([NumberOrExpressionSchema, z.literal('auto')]).optional(),
  height: z.union([NumberOrExpressionSchema, z.literal('auto')]).optional(),

  // Border
  borderRadius: z.union([NumberOrExpressionSchema, z.string()]).optional(),
  borderWidth: NumberOrExpressionSchema.optional(),

  // SVG
  strokeWidth: NumberOrExpressionSchema.optional(),
  strokeDasharray: z.string().optional(),
  strokeDashoffset: NumberOrExpressionSchema.optional(),
  pathLength: NumberOrExpressionSchema.optional(),

  // Filters
  blur: NumberOrExpressionSchema.optional(),
  brightness: NumberOrExpressionSchema.optional(),
  contrast: NumberOrExpressionSchema.optional(),
  saturate: NumberOrExpressionSchema.optional(),
  hueRotate: NumberOrExpressionSchema.optional(),
  grayscale: NumberOrExpressionSchema.optional(),
  sepia: NumberOrExpressionSchema.optional(),
  invert: NumberOrExpressionSchema.optional(),

  // Shadows
  boxShadow: z
    .union([ShadowDefinitionSchema, z.array(ShadowDefinitionSchema)])
    .optional(),

  // Path motion
  pathMotion: z
    .object({
      path: z.string(),
      progress: NumberOrExpressionSchema,
      autoRotate: z.boolean().optional(),
      offset: NumberOrExpressionSchema.optional(),
    })
    .passthrough()
    .optional(),

  // Clip
  clipPath: z.string().optional(),

  // 3D
  perspective: NumberOrExpressionSchema.optional(),
  perspectiveOrigin: z.string().optional(),
  backfaceVisibility: z.enum(['visible', 'hidden']).optional(),
  transformStyle: z.enum(['flat', 'preserve-3d']).optional(),
}).passthrough();

// ============================================================
// TRIGGER SCHEMAS
// ============================================================

const ScrollTriggerConfigSchema = z.object({
  target: z.string().optional(),
  axis: z.enum(['x', 'y']).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  scrub: z.union([z.boolean(), z.number()]).optional(),
  pin: z.boolean().optional(),
  markers: z.boolean().optional(),
  offset: z.tuple([z.number(), z.number()]).optional(),
});

const InViewConfigSchema = z.object({
  margin: z.string().optional(),
  amount: z.union([z.enum(['some', 'all']), z.number()]).optional(),
  once: z.boolean().optional(),
});

const AudioTriggerConfigSchema = z.object({
  band: z
    .union([z.number(), z.enum(['bass', 'mid', 'treble', 'all'])])
    .optional(),
  threshold: z.number().min(0).max(1),
  edge: z.enum(['rising', 'falling', 'both']).optional(),
});

const TriggerDefinitionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mount'), delay: z.number().optional() }).passthrough(),
  z.object({ type: z.literal('unmount') }).passthrough(),
  z.object({ type: z.literal('hover'), element: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('hoverEnd'), element: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('tap'), element: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('focus'), element: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('blur'), element: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('scroll'), config: ScrollTriggerConfigSchema }).passthrough(),
  z.object({ type: z.literal('inView'), config: InViewConfigSchema.optional() }).passthrough(),
  z.object({
    type: z.literal('swipe'),
    direction: z.enum(['left', 'right', 'up', 'down', 'any']),
    element: z.string().optional(),
    threshold: z.number().optional(),
    velocity: z.number().optional(),
  }).passthrough(),
  z.object({
    type: z.literal('drag'),
    element: z.string().optional(),
    axis: z.enum(['x', 'y', 'both']).optional(),
  }).passthrough(),
  z.object({ type: z.literal('custom'), event: z.string() }).passthrough(),
  z.object({ type: z.literal('state'), condition: z.string() }).passthrough(),
  z.object({ type: z.literal('audio'), config: AudioTriggerConfigSchema }).passthrough(),
]);

// ============================================================
// ANIMATION BLOCK SCHEMAS
// ============================================================

const KeyframeDefinitionSchema = z.object({
  at: z.number().min(0).max(100),
  state: ElementStateSchema.partial(),
  easing: EasingDefinitionSchema.optional(),
});

// Base animation properties shared across types
const BaseAnimationProps = {
  delay: z.number().optional(),
  offset: z.number().optional(),
  stagger: StaggerDefinitionSchema.optional(),
};

const KeyframeAnimationSchema = z.object({
  type: z.literal('keyframes'),
  target: z.union([z.string(), z.array(z.string())]),
  keyframes: z.array(KeyframeDefinitionSchema).min(1),
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
  label: z.string().optional(),
  ...BaseAnimationProps,
});

const SpringAnimationSchema = z.object({
  type: z.literal('spring'),
  target: z.union([z.string(), z.array(z.string())]),
  from: ElementStateSchema.partial().optional(),
  to: ElementStateSchema.partial(),
  spring: SpringConfigSchema,
  ...BaseAnimationProps,
});

const TransitionAnimationSchema = z.object({
  type: z.literal('transition'),
  target: z.union([z.string(), z.array(z.string())]),
  from: ElementStateSchema.partial().optional(),
  to: ElementStateSchema.partial(),
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
  ...BaseAnimationProps,
});

const MorphAnimationSchema = z.object({
  type: z.literal('morph'),
  target: z.string(),
  from: z.string().optional(),
  to: z.string(),
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
  delay: z.number().optional(),
  offset: z.number().optional(),
});

const MatchCutAnimationSchema = z.object({
  type: z.literal('matchCut'),
  from: z.string(),
  to: z.string(),
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
  zoomPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  crossfade: z.boolean().optional(),
  offset: z.number().optional(),
});

const ParticleEmitterConfigSchema = z.object({
  position: z.object({ x: z.number(), y: z.number() }),
  count: z.number().int().positive(),
  rate: z.number().optional(),
  burst: z.boolean().optional(),
  lifetime: z.object({ min: z.number(), max: z.number() }),
  velocity: z.object({
    speed: z.object({ min: z.number(), max: z.number() }),
    direction: z.object({ min: z.number(), max: z.number() }),
  }),
  physics: z
    .object({
      gravity: z.object({ x: z.number(), y: z.number() }).optional(),
      friction: z.number().optional(),
      bounce: z.number().optional(),
    })
    .optional(),
  appearance: z.object({
    shape: z.enum(['circle', 'square', 'star', 'confetti', 'image']),
    size: z.object({ start: z.number(), end: z.number() }),
    colors: z.array(ColorValueSchema),
    opacity: z.object({ start: z.number(), end: z.number() }),
    rotation: z
      .object({
        speed: z.number(),
        random: z.boolean().optional(),
      })
      .optional(),
  }),
});

const ParticleAnimationSchema = z.object({
  type: z.literal('particles'),
  emitter: ParticleEmitterConfigSchema,
  duration: z.number().optional(),
  offset: z.number().optional(),
});

const TextAnimationSchema = z.object({
  type: z.literal('text'),
  target: z.string(),
  effect: z.enum([
    'typewriter',
    'scramble',
    'split',
    'wave',
    'gradient',
    'reveal',
  ]),
  duration: z.number().optional(),
  stagger: z.number().optional(),
  splitBy: z.enum(['character', 'word', 'line']).optional(),
  easing: EasingDefinitionSchema.optional(),
  delay: z.number().optional(),
  offset: z.number().optional(),
});

// We need to create a recursive schema for GroupAnimation
// Using z.lazy for the recursive reference
const AnimationBlockSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    KeyframeAnimationSchema.passthrough(),
    SpringAnimationSchema.passthrough(),
    TransitionAnimationSchema.passthrough(),
    z.object({
      type: z.literal('group'),
      mode: z.enum(['parallel', 'sequence']),
      animations: z.array(AnimationBlockSchema),
      delay: z.number().optional(),
      stagger: StaggerDefinitionSchema.optional(),
      offset: z.number().optional(),
    }).passthrough(),
    MorphAnimationSchema.passthrough(),
    MatchCutAnimationSchema.passthrough(),
    z.object({
      type: z.literal('drag'),
      target: z.string(),
      axis: z.enum(['x', 'y', 'both']).optional(),
      constraints: z
        .object({
          left: z.number().optional(),
          right: z.number().optional(),
          top: z.number().optional(),
          bottom: z.number().optional(),
        })
        .optional(),
      elastic: z.number().optional(),
      dragElastic: z.number().optional(),
      dragMomentum: z.boolean().optional(),
      onRelease: AnimationBlockSchema.optional(),
    }).passthrough(),
    ParticleAnimationSchema.passthrough(),
    TextAnimationSchema.passthrough(),
  ])
);

// ============================================================
// ELEMENT SCHEMAS
// ============================================================

const BlendModeSchema = z.enum([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'colorDodge',
  'colorBurn',
  'hardLight',
  'softLight',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]);

const MaskDefinitionSchema = z.object({
  path: z.string().optional(),
  element: z.string().optional(),
  mode: z.enum(['alpha', 'luminance']),
  inverted: z.boolean().optional(),
});

const EffectDefinitionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('glow'),
    color: ColorValueSchema.optional(),
    radius: NumberOrExpressionSchema,
    intensity: NumberOrExpressionSchema,
    threshold: NumberOrExpressionSchema.optional(),
  }),
  z.object({
    type: z.literal('lightRays'),
    origin: z.object({ x: z.number(), y: z.number() }),
    length: NumberOrExpressionSchema,
    intensity: NumberOrExpressionSchema,
    color: ColorValueSchema.optional(),
    decay: NumberOrExpressionSchema.optional(),
  }),
  z.object({
    type: z.literal('dropShadow'),
    color: ColorValueSchema,
    offsetX: NumberOrExpressionSchema,
    offsetY: NumberOrExpressionSchema,
    blur: NumberOrExpressionSchema,
    spread: NumberOrExpressionSchema.optional(),
  }),
  z.object({
    type: z.literal('motionBlur'),
    samples: z.number().int().positive(),
    strength: NumberOrExpressionSchema,
  }),
]);

const BaseElementSchema = z.object({
  initial: ElementStateSchema.optional().default({}),
  blendMode: BlendModeSchema.optional(),
  mask: MaskDefinitionSchema.optional(),
  effects: z.array(EffectDefinitionSchema).optional(),
}).passthrough();

const LayoutDefinitionSchema = z.object({
  type: z.enum(['row', 'column', 'stack', 'wrap', 'grid']),
  gap: NumberOrExpressionSchema.optional(),
  padding: z
    .union([
      NumberOrExpressionSchema,
      z.tuple([
        NumberOrExpressionSchema,
        NumberOrExpressionSchema,
        NumberOrExpressionSchema,
        NumberOrExpressionSchema,
      ]),
    ])
    .optional(),
  align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
  justify: z
    .enum(['start', 'center', 'end', 'between', 'around', 'evenly'])
    .optional(),
  wrap: z.boolean().optional(),
  columns: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
});

const ElementDefinitionSchema = z.discriminatedUnion('type', [
  BaseElementSchema.extend({ type: z.literal('box') }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('circle'),
    radius: NumberOrExpressionSchema.optional(),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('text'),
    content: z.string(),
    font: z.string().optional(),
    fontSize: NumberOrExpressionSchema.optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    lineHeight: NumberOrExpressionSchema.optional(),
    letterSpacing: NumberOrExpressionSchema.optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('svg'),
    viewBox: z.string().optional(),
    children: z.array(z.string()).optional().default([]),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('path'),
    d: z.string(),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('mesh'),
    image: z.string(),
    vertices: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        u: z.number().optional(),
        v: z.number().optional(),
      })
    ),
    triangles: z.array(z.number().int().nonnegative()),
    bones: z
      .array(
        z.object({
          bone: z.string(),
          vertices: z.array(z.number().int().nonnegative()),
          weights: z.array(z.number().min(0).max(1)),
        })
      )
      .optional(),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('group'),
    children: z.array(z.string()).optional().default([]),
    layout: LayoutDefinitionSchema.optional(),
  }).passthrough(),
  BaseElementSchema.extend({
    type: z.literal('custom'),
    component: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
]);

// ============================================================
// SEQUENCE & TIMELINE SCHEMAS
// ============================================================

const SequenceDefinitionSchema = z.object({
  id: z.string().optional(),
  trigger: TriggerDefinitionSchema,
  animations: z.array(AnimationBlockSchema),
  repeat: RepeatDefinitionSchema.optional(),
  yoyo: z.boolean().optional(),
});

const AnimationDefaultsSchema = z.object({
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
  stagger: StaggerDefinitionSchema.optional(),
});

const TimelineDefinitionSchema = z.object({
  defaults: AnimationDefaultsSchema.optional(),
  sequences: z.array(SequenceDefinitionSchema),
}).passthrough();

// ============================================================
// STATE MACHINE SCHEMA
// ============================================================

const StateTransitionSchema = z.object({
  target: z.string(),
  condition: z.string().optional(),
  trigger: z.string().optional(),
  duration: z.number().optional(),
  easing: EasingDefinitionSchema.optional(),
});

const StateDefinitionSchema = z.object({
  animation: z.string().optional(),
  onEnter: z.array(AnimationBlockSchema).optional(),
  onExit: z.array(AnimationBlockSchema).optional(),
  transitions: z.array(StateTransitionSchema),
});

const InputDefinitionSchema = z.object({
  type: z.enum(['boolean', 'number', 'trigger']),
  default: z.union([z.boolean(), z.number()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const StateMachineSchema = z.object({
  initial: z.string(),
  states: z.record(z.string(), StateDefinitionSchema),
  inputs: z.record(z.string(), InputDefinitionSchema).optional(),
});

// ============================================================
// DATA BINDING SCHEMA
// ============================================================

const ViewModelPropertySchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'color', 'enum']),
  default: z.union([z.string(), z.number(), z.boolean()]),
  options: z.array(z.string()).optional(),
});

const PropertyBindingSchema = z.object({
  source: z.string(),
  target: z.string(),
  transform: z.string().optional(),
});

const DataBindingSchema = z.object({
  viewModel: z.record(z.string(), ViewModelPropertySchema),
  bindings: z.array(PropertyBindingSchema),
});

// ============================================================
// AUDIO CONFIG SCHEMA
// ============================================================

const AudioAnalysisConfigSchema = z.object({
  bands: z.number().int().min(1).max(32).optional(),
  smoothing: z.number().min(0).max(1).optional(),
  minDecibels: z.number().optional(),
  maxDecibels: z.number().optional(),
  fftSize: z.number().int().optional(),
});

const AudioBindingSchema = z.object({
  band: z
    .union([z.number(), z.enum(['bass', 'mid', 'treble', 'all'])])
    .optional(),
  property: z.string(),
  range: z.tuple([z.number(), z.number()]),
  output: z.tuple([z.number(), z.number()]),
  easing: EasingDefinitionSchema.optional(),
});

const AudioConfigSchema = z.object({
  source: z.string(),
  analysis: AudioAnalysisConfigSchema.optional(),
  bindings: z.array(AudioBindingSchema).optional(),
});

// ============================================================
// META SCHEMA
// ============================================================

const AnimationMetaSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  fps: z.number().int().positive().optional(),
  viewport: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

// ============================================================
// ROOT SCHEMA
// ============================================================

export const KineticAnimationSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal('1.0'),
  meta: AnimationMetaSchema.optional(),
  variables: z
    .record(z.string(), z.union([z.number(), z.string(), z.array(z.number())]))
    .optional(),
  audio: AudioConfigSchema.optional(),
  elements: z.record(z.string(), ElementDefinitionSchema),
  timeline: TimelineDefinitionSchema,
  stateMachine: StateMachineSchema.optional(),
  dataBinding: DataBindingSchema.optional(),
}).passthrough();

// ============================================================
// VALIDATION TYPES & FUNCTIONS
// ============================================================

export type ValidationError = {
  path: string;
  message: string;
  code?: string;
};

export type ValidationResult =
  | { valid: true; data: KineticAnimation; errors: [] }
  | { valid: false; data: null; errors: ValidationError[] };

/**
 * Validate a DSL object against the schema
 */
export function validateDSL(input: unknown): ValidationResult {
  const result = KineticAnimationSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      data: result.data as KineticAnimation,
      errors: [],
    };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    valid: false,
    data: null,
    errors,
  };
}

/**
 * Validate DSL JSON string
 */
export function validateDSLString(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    return validateDSL(parsed);
  } catch (e) {
    return {
      valid: false,
      data: null,
      errors: [
        {
          path: '',
          message: `JSON Parse Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          code: 'invalid_json',
        },
      ],
    };
  }
}

/**
 * Check if a value is a valid expression
 */
export function isExpression(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\$[\w.]+$|^\$\{.+\}$/.test(value);
}

/**
 * Extract variable names from an expression
 */
export function extractVariables(expression: string): string[] {
  const matches = expression.match(/\$(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

// Export individual schemas for testing/external use
export {
  ElementStateSchema,
  AnimationBlockSchema,
  TriggerDefinitionSchema,
  EasingDefinitionSchema,
  SpringConfigSchema,
  ElementDefinitionSchema,
  SequenceDefinitionSchema,
  TimelineDefinitionSchema,
};
