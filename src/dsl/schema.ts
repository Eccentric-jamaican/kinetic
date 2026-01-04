/**
 * Kinetic Animation DSL v1.0
 * A comprehensive domain-specific language for describing animations
 * that can compile to multiple targets (Framer Motion, CSS, GSAP, Lottie)
 *
 * Designed for:
 * - LLM-friendly generation
 * - Rive + After Effects feature parity
 * - Web-native runtime execution
 */

// ============================================================
// ROOT TYPE
// ============================================================

export type KineticAnimation = {
  $schema?: string;
  version: '1.0';
  meta?: AnimationMeta;
  variables?: Record<string, VariableValue>;
  audio?: AudioConfig;
  elements: Record<string, ElementDefinition>;
  timeline: TimelineDefinition;
  stateMachine?: StateMachine;
  dataBinding?: DataBinding;
};

export type AnimationMeta = {
  name?: string;
  description?: string;
  duration?: number; // total duration hint in ms
  fps?: number; // target framerate (default 60)
  viewport?: { width: number; height: number };
};

// ============================================================
// VARIABLES & EXPRESSIONS
// ============================================================

export type VariableValue = number | string | number[] | ColorValue;

// Expression syntax: "$variableName" or "${expression}"
export type Expression = string; // e.g., "$duration * 0.5"

export type NumberOrExpression = number | Expression;
export type ColorValue = string; // hex, rgb(), hsl(), or named

// ============================================================
// ELEMENTS
// ============================================================

export type ElementDefinition =
  | BoxElement
  | CircleElement
  | TextElement
  | SvgElement
  | PathElement
  | MeshElement
  | GroupElement
  | CustomElement;

export type BaseElement = {
  initial: ElementState;
  blendMode?: BlendMode;
  mask?: MaskDefinition;
  effects?: EffectDefinition[];
};

export type BoxElement = BaseElement & {
  type: 'box';
};

export type CircleElement = BaseElement & {
  type: 'circle';
  radius?: NumberOrExpression;
};

export type TextElement = BaseElement & {
  type: 'text';
  content: string;
  font?: string;
  fontSize?: NumberOrExpression;
  fontWeight?: number | string;
  lineHeight?: NumberOrExpression;
  letterSpacing?: NumberOrExpression;
  textAlign?: 'left' | 'center' | 'right';
};

export type SvgElement = BaseElement & {
  type: 'svg';
  viewBox?: string;
  children: string[]; // element IDs of paths/shapes
};

export type PathElement = BaseElement & {
  type: 'path';
  d: string; // SVG path data
};

export type MeshElement = BaseElement & {
  type: 'mesh';
  image: string; // image URL or data URI
  vertices: Vertex[];
  triangles: number[]; // triangle vertex indices
  bones?: BoneBinding[];
};

export type GroupElement = BaseElement & {
  type: 'group';
  children: string[]; // element IDs
  layout?: LayoutDefinition;
};

export type CustomElement = BaseElement & {
  type: 'custom';
  component: string; // React component reference
  props?: Record<string, unknown>;
};

// ============================================================
// ELEMENT STATE (Animatable Properties)
// ============================================================

export type ElementState = {
  // Transform properties
  x?: NumberOrExpression;
  y?: NumberOrExpression;
  z?: NumberOrExpression;

  scaleX?: NumberOrExpression;
  scaleY?: NumberOrExpression;
  scale?: NumberOrExpression; // shorthand for uniform scale

  rotateX?: NumberOrExpression; // degrees
  rotateY?: NumberOrExpression;
  rotateZ?: NumberOrExpression;
  rotate?: NumberOrExpression; // shorthand for rotateZ

  skewX?: NumberOrExpression;
  skewY?: NumberOrExpression;

  // Origin for transforms
  originX?: NumberOrExpression; // 0-1 or percentage string
  originY?: NumberOrExpression;

  // Visual properties
  opacity?: NumberOrExpression;

  // Colors
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
  color?: ColorValue; // text color
  fill?: ColorValue; // SVG fill
  stroke?: ColorValue; // SVG stroke

  // Dimensions
  width?: NumberOrExpression | 'auto';
  height?: NumberOrExpression | 'auto';

  // Border
  borderRadius?: NumberOrExpression | string;
  borderWidth?: NumberOrExpression;

  // SVG specific
  strokeWidth?: NumberOrExpression;
  strokeDasharray?: string;
  strokeDashoffset?: NumberOrExpression;
  pathLength?: NumberOrExpression; // 0-1 for path drawing animations

  // Filters
  blur?: NumberOrExpression;
  brightness?: NumberOrExpression;
  contrast?: NumberOrExpression;
  saturate?: NumberOrExpression;
  hueRotate?: NumberOrExpression;
  grayscale?: NumberOrExpression;
  sepia?: NumberOrExpression;
  invert?: NumberOrExpression;

  // Shadows
  boxShadow?: ShadowDefinition | ShadowDefinition[];

  // Path motion (element follows a path)
  pathMotion?: {
    path: string; // SVG path or element ID reference
    progress: NumberOrExpression; // 0-1
    autoRotate?: boolean;
    offset?: NumberOrExpression; // additional rotation offset
  };

  // Clip path
  clipPath?: string;

  // 3D
  perspective?: NumberOrExpression;
  perspectiveOrigin?: string;
  backfaceVisibility?: 'visible' | 'hidden';
  transformStyle?: 'flat' | 'preserve-3d';
};

export type ShadowDefinition = {
  x: NumberOrExpression;
  y: NumberOrExpression;
  blur: NumberOrExpression;
  spread?: NumberOrExpression;
  color: ColorValue;
  inset?: boolean;
};

export type Vertex = {
  x: number;
  y: number;
  u?: number; // texture coordinate
  v?: number;
};

// ============================================================
// TIMELINE & ANIMATIONS
// ============================================================

export type TimelineDefinition = {
  defaults?: AnimationDefaults;
  sequences: SequenceDefinition[];
};

export type AnimationDefaults = {
  duration?: number;
  easing?: EasingDefinition;
  stagger?: StaggerDefinition;
};

export type SequenceDefinition = {
  id?: string;
  trigger: TriggerDefinition;
  animations: AnimationBlock[];
  repeat?: RepeatDefinition;
  yoyo?: boolean; // reverse on alternate iterations
};

// ============================================================
// TRIGGERS
// ============================================================

export type TriggerDefinition =
  | MountTrigger
  | UnmountTrigger
  | HoverTrigger
  | HoverEndTrigger
  | TapTrigger
  | FocusTrigger
  | BlurTrigger
  | ScrollTrigger
  | InViewTrigger
  | SwipeTrigger
  | DragTrigger
  | CustomTrigger
  | StateTrigger
  | AudioTrigger;

export type MountTrigger = {
  type: 'mount';
  delay?: number;
};

export type UnmountTrigger = {
  type: 'unmount';
};

export type HoverTrigger = {
  type: 'hover';
  element?: string; // element ID or self
};

export type HoverEndTrigger = {
  type: 'hoverEnd';
  element?: string;
};

export type TapTrigger = {
  type: 'tap';
  element?: string;
};

export type FocusTrigger = {
  type: 'focus';
  element?: string;
};

export type BlurTrigger = {
  type: 'blur';
  element?: string;
};

export type ScrollTrigger = {
  type: 'scroll';
  config: ScrollTriggerConfig;
};

export type ScrollTriggerConfig = {
  target?: string; // element ID, defaults to window
  axis?: 'x' | 'y';
  start?: string; // e.g., "top bottom" (element top hits viewport bottom)
  end?: string; // e.g., "bottom top"
  scrub?: boolean | number; // true or smoothing value
  pin?: boolean;
  markers?: boolean; // debug only
  offset?: [number, number]; // start/end offsets in px
};

export type InViewTrigger = {
  type: 'inView';
  config?: InViewConfig;
};

export type InViewConfig = {
  margin?: string; // intersection observer margin
  amount?: 'some' | 'all' | number; // visibility threshold
  once?: boolean;
};

export type SwipeTrigger = {
  type: 'swipe';
  direction: 'left' | 'right' | 'up' | 'down' | 'any';
  element?: string;
  threshold?: number; // min distance in px
  velocity?: number; // min velocity
};

export type DragTrigger = {
  type: 'drag';
  element?: string;
  axis?: 'x' | 'y' | 'both';
};

export type CustomTrigger = {
  type: 'custom';
  event: string;
};

export type StateTrigger = {
  type: 'state';
  condition: string; // expression that evaluates to boolean
};

export type AudioTrigger = {
  type: 'audio';
  config: AudioTriggerConfig;
};

export type AudioTriggerConfig = {
  band?: number | 'bass' | 'mid' | 'treble' | 'all';
  threshold: number; // 0-1
  edge?: 'rising' | 'falling' | 'both';
};

// ============================================================
// ANIMATION BLOCKS
// ============================================================

export type AnimationBlock =
  | KeyframeAnimation
  | SpringAnimation
  | TransitionAnimation
  | GroupAnimation
  | MorphAnimation
  | MatchCutAnimation
  | DragAnimation
  | ParticleAnimation
  | TextAnimation;

// Standard keyframe-based animation
export type KeyframeAnimation = {
  type: 'keyframes';
  target: string | string[]; // element ID(s)
  keyframes: KeyframeDefinition[];
  duration?: number;
  easing?: EasingDefinition;
  delay?: number;
  stagger?: StaggerDefinition;
  offset?: number; // position in parent timeline (ms)
  label?: string; // for referencing in other animations
};

export type KeyframeDefinition = {
  at: number; // 0-100 (percentage) or absolute time with "ms" suffix
  state: Partial<ElementState>;
  easing?: EasingDefinition; // easing TO this keyframe
};

// Spring physics animation (Framer Motion style)
export type SpringAnimation = {
  type: 'spring';
  target: string | string[];
  from?: Partial<ElementState>;
  to: Partial<ElementState>;
  spring: SpringConfig;
  delay?: number;
  stagger?: StaggerDefinition;
  offset?: number;
};

export type SpringConfig = {
  // Option 1: Direct physics values
  stiffness?: number; // default 100
  damping?: number; // default 10
  mass?: number; // default 1
  velocity?: number; // initial velocity
  restDelta?: number;
  restSpeed?: number;

  // Option 2: Preset
  preset?: SpringPreset;

  // Option 3: Duration-based spring (like Framer Motion)
  duration?: number;
  bounce?: number; // 0-1
};

export type SpringPreset =
  | 'gentle'
  | 'wobbly'
  | 'stiff'
  | 'slow'
  | 'molasses'
  | 'bouncy';

// Simple from/to transition
export type TransitionAnimation = {
  type: 'transition';
  target: string | string[];
  from?: Partial<ElementState>;
  to: Partial<ElementState>;
  duration?: number;
  easing?: EasingDefinition;
  delay?: number;
  stagger?: StaggerDefinition;
  offset?: number;
};

// Animation grouping (parallel or sequential)
export type GroupAnimation = {
  type: 'group';
  mode: 'parallel' | 'sequence';
  animations: AnimationBlock[];
  delay?: number;
  stagger?: StaggerDefinition; // for sequence mode
  offset?: number;
};

// SVG Path Morphing
export type MorphAnimation = {
  type: 'morph';
  target: string;
  from?: string; // starting path d=""
  to: string; // ending path d=""
  duration?: number;
  easing?: EasingDefinition;
  delay?: number;
  offset?: number;
};

// Match Cut - coordinated zoom/position transition
export type MatchCutAnimation = {
  type: 'matchCut';
  from: string; // source element ID
  to: string; // destination element ID
  duration?: number;
  easing?: EasingDefinition;
  zoomPoint?: { x: number; y: number }; // focal point (0-1)
  crossfade?: boolean;
  offset?: number;
};

// Drag-based animation
export type DragAnimation = {
  type: 'drag';
  target: string;
  axis?: 'x' | 'y' | 'both';
  constraints?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  elastic?: number; // bounce at constraints (0-1)
  dragElastic?: number;
  dragMomentum?: boolean;
  onRelease?: AnimationBlock; // animation when released
};

// Particle effects
export type ParticleAnimation = {
  type: 'particles';
  emitter: ParticleEmitterConfig;
  duration?: number;
  offset?: number;
};

export type ParticleEmitterConfig = {
  position: { x: number; y: number };
  count: number;
  rate?: number; // particles per second (for continuous)
  burst?: boolean;
  lifetime: { min: number; max: number };
  velocity: {
    speed: { min: number; max: number };
    direction: { min: number; max: number }; // degrees
  };
  physics?: {
    gravity?: { x: number; y: number };
    friction?: number;
    bounce?: number;
  };
  appearance: {
    shape: 'circle' | 'square' | 'star' | 'confetti' | 'image';
    size: { start: number; end: number };
    colors: ColorValue[];
    opacity: { start: number; end: number };
    rotation?: { speed: number; random?: boolean };
  };
};

// Text-specific animations
export type TextAnimation = {
  type: 'text';
  target: string;
  effect:
    | 'typewriter'
    | 'scramble'
    | 'split'
    | 'wave'
    | 'gradient'
    | 'reveal';
  duration?: number;
  stagger?: number; // per character/word
  splitBy?: 'character' | 'word' | 'line';
  easing?: EasingDefinition;
  delay?: number;
  offset?: number;
};

// ============================================================
// EASING
// ============================================================

export type EasingDefinition =
  | EasingPreset
  | CubicBezierEasing
  | StepsEasing
  | SpringEasing;

export type EasingPreset =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInCirc'
  | 'easeOutCirc'
  | 'easeInOutCirc'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce';

export type CubicBezierEasing = {
  type: 'cubicBezier';
  values: [number, number, number, number]; // [x1, y1, x2, y2]
};

export type StepsEasing = {
  type: 'steps';
  count: number;
  position?: 'start' | 'end' | 'both' | 'none';
};

export type SpringEasing = {
  type: 'spring';
  config: SpringConfig;
};

// ============================================================
// STAGGER
// ============================================================

export type StaggerDefinition = {
  each: number; // delay between each element in ms
  from?: 'first' | 'last' | 'center' | 'edges' | number; // start index
  grid?: [number, number]; // for 2D stagger [columns, rows]
  axis?: 'x' | 'y'; // for grid stagger
  ease?: EasingDefinition; // easing for stagger distribution
};

// ============================================================
// REPEAT
// ============================================================

export type RepeatDefinition = {
  count: number | 'infinite';
  delay?: number; // delay between iterations
  behavior?: 'loop' | 'reverse'; // reverse alternates direction
};

// ============================================================
// STATE MACHINE (Rive-like)
// ============================================================

export type StateMachine = {
  initial: string; // initial state ID
  states: Record<string, StateDefinition>;
  inputs?: Record<string, InputDefinition>;
};

export type StateDefinition = {
  animation?: string; // sequence ID to play
  onEnter?: AnimationBlock[];
  onExit?: AnimationBlock[];
  transitions: StateTransition[];
};

export type StateTransition = {
  target: string; // target state ID
  condition?: string; // expression
  trigger?: string; // input name
  duration?: number; // blend duration
  easing?: EasingDefinition;
};

export type InputDefinition = {
  type: 'boolean' | 'number' | 'trigger';
  default?: boolean | number;
  min?: number;
  max?: number;
};

// ============================================================
// DATA BINDING (Rive-like)
// ============================================================

export type DataBinding = {
  viewModel: Record<string, ViewModelProperty>;
  bindings: PropertyBinding[];
};

export type ViewModelProperty = {
  type: 'string' | 'number' | 'boolean' | 'color' | 'enum';
  default: string | number | boolean;
  options?: string[]; // for enum type
};

export type PropertyBinding = {
  source: string; // viewModel property path
  target: string; // element.property path
  transform?: string; // optional expression to transform value
};

// ============================================================
// AUDIO SYNC (After Effects-like)
// ============================================================

export type AudioConfig = {
  source: string; // audio file URL or data URI
  analysis?: AudioAnalysisConfig;
  bindings?: AudioBinding[];
};

export type AudioAnalysisConfig = {
  bands?: number; // frequency bands (1-32)
  smoothing?: number; // 0-1
  minDecibels?: number;
  maxDecibels?: number;
  fftSize?: number;
};

export type AudioBinding = {
  band?: number | 'bass' | 'mid' | 'treble' | 'all';
  property: string; // element.property path
  range: [number, number]; // input range (amplitude)
  output: [number, number]; // output range (property value)
  easing?: EasingDefinition;
};

// ============================================================
// EFFECTS & FILTERS
// ============================================================

export type EffectDefinition =
  | GlowEffect
  | LightRaysEffect
  | DropShadowEffect
  | MotionBlurEffect;

export type GlowEffect = {
  type: 'glow';
  color?: ColorValue;
  radius: NumberOrExpression;
  intensity: NumberOrExpression;
  threshold?: NumberOrExpression;
};

export type LightRaysEffect = {
  type: 'lightRays';
  origin: { x: number; y: number };
  length: NumberOrExpression;
  intensity: NumberOrExpression;
  color?: ColorValue;
  decay?: NumberOrExpression;
};

export type DropShadowEffect = {
  type: 'dropShadow';
  color: ColorValue;
  offsetX: NumberOrExpression;
  offsetY: NumberOrExpression;
  blur: NumberOrExpression;
  spread?: NumberOrExpression;
};

export type MotionBlurEffect = {
  type: 'motionBlur';
  samples: number;
  strength: NumberOrExpression;
};

// ============================================================
// MASKS & BLEND MODES
// ============================================================

export type MaskDefinition = {
  path?: string; // SVG path
  element?: string; // element ID to use as mask
  mode: 'alpha' | 'luminance';
  inverted?: boolean;
};

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'hardLight'
  | 'softLight'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// ============================================================
// LAYOUT (Rive-like)
// ============================================================

export type LayoutDefinition = {
  type: 'row' | 'column' | 'stack' | 'wrap' | 'grid';
  gap?: NumberOrExpression;
  padding?:
    | NumberOrExpression
    | [NumberOrExpression, NumberOrExpression, NumberOrExpression, NumberOrExpression];
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  // Grid specific
  columns?: number;
  rows?: number;
  // Responsive
  responsive?: ResponsiveBreakpoint[];
};

export type ResponsiveBreakpoint = {
  minWidth?: number;
  maxWidth?: number;
  layout: Partial<LayoutDefinition>;
};

// ============================================================
// BONES & SKELETAL ANIMATION (Rive-like)
// ============================================================

export type BoneSystem = {
  bones: Record<string, BoneDefinition>;
  ikConstraints?: IKConstraint[];
};

export type BoneDefinition = {
  parent?: string;
  position: { x: number; y: number };
  rotation: number; // degrees
  length: number;
  scale?: { x: number; y: number };
};

export type BoneBinding = {
  bone: string;
  vertices: number[]; // vertex indices
  weights: number[]; // weight per vertex (0-1)
};

export type IKConstraint = {
  id: string;
  target: string; // bone to control
  chain: string[]; // bones in IK chain
  pole?: { x: number; y: number }; // bend direction hint
  iterations?: number;
  enabled?: boolean;
};

// ============================================================
// EVENTS (Rive-like)
// ============================================================

export type EventDefinition = {
  name: string;
  trigger: 'timeline' | 'transition' | 'state' | 'input';
  at?: number; // time in ms for timeline events
  payload?: Record<string, unknown>;
};

// ============================================================
// JOYSTICKS (Rive-like)
// ============================================================

export type JoystickDefinition = {
  id: string;
  position: { x: number; y: number };
  bounds?: { width: number; height: number };
  axes: {
    x?: {
      sequence: string; // sequence ID
      range: [number, number]; // map joystick -1 to 1 → timeline 0% to 100%
    };
    y?: {
      sequence: string;
      range: [number, number];
    };
  };
  returnToCenter?: boolean;
  spring?: SpringConfig;
};

// ============================================================
// TYPE GUARDS
// ============================================================

export function isKeyframeAnimation(block: AnimationBlock): block is KeyframeAnimation {
  return block.type === 'keyframes';
}

export function isSpringAnimation(block: AnimationBlock): block is SpringAnimation {
  return block.type === 'spring';
}

export function isTransitionAnimation(block: AnimationBlock): block is TransitionAnimation {
  return block.type === 'transition';
}

export function isGroupAnimation(block: AnimationBlock): block is GroupAnimation {
  return block.type === 'group';
}

export function isMorphAnimation(block: AnimationBlock): block is MorphAnimation {
  return block.type === 'morph';
}

export function isParticleAnimation(block: AnimationBlock): block is ParticleAnimation {
  return block.type === 'particles';
}

export function isTextAnimation(block: AnimationBlock): block is TextAnimation {
  return block.type === 'text';
}
