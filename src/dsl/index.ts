/**
 * Kinetic DSL Module
 * Export all DSL-related types, schemas, and utilities
 */

// Types
export type {
  // Root
  KineticAnimation,
  AnimationMeta,

  // Variables
  VariableValue,
  Expression,
  NumberOrExpression,
  ColorValue,

  // Elements
  ElementDefinition,
  BaseElement,
  BoxElement,
  CircleElement,
  TextElement,
  SvgElement,
  PathElement,
  MeshElement,
  GroupElement,
  CustomElement,
  ElementState,
  ShadowDefinition,
  Vertex,

  // Timeline
  TimelineDefinition,
  AnimationDefaults,
  SequenceDefinition,

  // Triggers
  TriggerDefinition,
  MountTrigger,
  UnmountTrigger,
  HoverTrigger,
  HoverEndTrigger,
  TapTrigger,
  FocusTrigger,
  BlurTrigger,
  ScrollTrigger,
  ScrollTriggerConfig,
  InViewTrigger,
  InViewConfig,
  SwipeTrigger,
  DragTrigger,
  CustomTrigger,
  StateTrigger,
  AudioTrigger,
  AudioTriggerConfig,

  // Animations
  AnimationBlock,
  KeyframeAnimation,
  KeyframeDefinition,
  SpringAnimation,
  SpringConfig,
  SpringPreset,
  TransitionAnimation,
  GroupAnimation,
  MorphAnimation,
  MatchCutAnimation,
  DragAnimation,
  ParticleAnimation,
  ParticleEmitterConfig,
  TextAnimation,

  // Easing
  EasingDefinition,
  EasingPreset,
  CubicBezierEasing,
  StepsEasing,
  SpringEasing,

  // Stagger & Repeat
  StaggerDefinition,
  RepeatDefinition,

  // State Machine
  StateMachine,
  StateDefinition,
  StateTransition,
  InputDefinition,

  // Data Binding
  DataBinding,
  ViewModelProperty,
  PropertyBinding,

  // Audio
  AudioConfig,
  AudioAnalysisConfig,
  AudioBinding,

  // Effects
  EffectDefinition,
  GlowEffect,
  LightRaysEffect,
  DropShadowEffect,
  MotionBlurEffect,

  // Masks & Blend
  MaskDefinition,
  BlendMode,

  // Layout
  LayoutDefinition,
  ResponsiveBreakpoint,

  // Bones
  BoneSystem,
  BoneDefinition,
  BoneBinding,
  IKConstraint,

  // Events & Joysticks
  EventDefinition,
  JoystickDefinition,
} from './schema';

// Type Guards
export {
  isKeyframeAnimation,
  isSpringAnimation,
  isTransitionAnimation,
  isGroupAnimation,
  isMorphAnimation,
  isParticleAnimation,
  isTextAnimation,
} from './schema';

// Validator
export {
  validateDSL,
  validateDSLString,
  isExpression,
  extractVariables,
  KineticAnimationSchema,
  ElementStateSchema,
  AnimationBlockSchema,
  TriggerDefinitionSchema,
  EasingDefinitionSchema,
  SpringConfigSchema,
  ElementDefinitionSchema,
  SequenceDefinitionSchema,
  TimelineDefinitionSchema,
} from './validator';

export type { ValidationError, ValidationResult } from './validator';

// Parser
export {
  DSLParser,
  parseDSL,
  parseDSLString,
  getElementIds,
  getSequenceIds,
  getVariableNames,
  cloneDSL,
  mergeDSL,
  createEmptyDSL,
  addElement,
  removeElement,
  addSequence,
  SPRING_PRESETS,
} from './parser';

export type {
  ParsedAnimation,
  ResolvedElement,
  ResolvedElementState,
  ResolvedTimeline,
  ResolvedSequence,
  ResolvedAnimationBlock,
  ParseError,
  ParseResult,
} from './parser';
