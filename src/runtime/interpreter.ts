/**
 * Kinetic Animation Interpreter
 * Executes DSL animations using Framer Motion
 */

import type { TargetAndTransition, Transition } from 'framer-motion';
import { useAnimation } from 'framer-motion';

// Get AnimationControls type from useAnimation return type
type AnimationControls = ReturnType<typeof useAnimation>;
import type {
  KineticAnimation,
  SequenceDefinition,
  AnimationBlock,
  ElementState,
  EasingDefinition,
  EasingPreset,
  SpringConfig,
  StaggerDefinition,
  TriggerDefinition,
} from '@/dsl/schema';
import { SPRING_PRESETS } from '@/dsl/parser';

// ============================================================
// TYPES
// ============================================================

export type ControlsMap = Map<string, AnimationControls>;

export type InterpreterState = 'idle' | 'playing' | 'paused' | 'stopped';

export type InterpreterEvent = {
  type: 'stateChange' | 'sequenceStart' | 'sequenceEnd' | 'animationStart' | 'animationEnd' | 'error';
  data?: unknown;
};

export type InterpreterEventHandler = (event: InterpreterEvent) => void;

// ============================================================
// EASING CONVERSION
// ============================================================

const EASING_PRESETS: Record<EasingPreset, number[] | string> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  easeInQuad: [0.55, 0.085, 0.68, 0.53],
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  easeInOutQuad: [0.455, 0.03, 0.515, 0.955],
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  easeInQuart: [0.895, 0.03, 0.685, 0.22],
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeInOutQuart: [0.77, 0, 0.175, 1],
  easeInQuint: [0.755, 0.05, 0.855, 0.06],
  easeOutQuint: [0.23, 1, 0.32, 1],
  easeInOutQuint: [0.86, 0, 0.07, 1],
  easeInExpo: [0.95, 0.05, 0.795, 0.035],
  easeOutExpo: [0.19, 1, 0.22, 1],
  easeInOutExpo: [1, 0, 0, 1],
  easeInCirc: [0.6, 0.04, 0.98, 0.335],
  easeOutCirc: [0.075, 0.82, 0.165, 1],
  easeInOutCirc: [0.785, 0.135, 0.15, 0.86],
  easeInBack: [0.6, -0.28, 0.735, 0.045],
  easeOutBack: [0.175, 0.885, 0.32, 1.275],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
  easeInElastic: 'easeInElastic', // Special case - use Framer spring
  easeOutElastic: 'easeOutElastic',
  easeInOutElastic: 'easeInOutElastic',
  easeInBounce: 'easeInBounce', // Special case
  easeOutBounce: 'easeOutBounce',
  easeInOutBounce: 'easeInOutBounce',
};

export function convertEasing(
  easing: EasingDefinition | undefined
): Transition['ease'] | undefined {
  if (!easing) return undefined;

  if (typeof easing === 'string') {
    const preset = EASING_PRESETS[easing];
    if (Array.isArray(preset)) {
      return preset as [number, number, number, number];
    }
    // For elastic/bounce, return undefined and handle with spring
    return undefined;
  }

  if (easing.type === 'cubicBezier') {
    return easing.values;
  }

  if (easing.type === 'steps') {
    // Framer Motion doesn't support steps directly, approximate with linear
    return [0, 0, 1, 1];
  }

  if (easing.type === 'spring') {
    // Return undefined, will use spring transition instead
    return undefined;
  }

  return undefined;
}

// ============================================================
// STATE CONVERSION
// ============================================================

/**
 * Convert DSL ElementState to Framer Motion animate object
 */
export function convertStateToFramerMotion(
  state: Partial<ElementState>
): TargetAndTransition {
  const result: Record<string, unknown> = {};

  // Direct mappings
  const directProps = [
    'x', 'y', 'opacity', 'scale', 'scaleX', 'scaleY',
    'rotate', 'rotateX', 'rotateY', 'rotateZ',
    'skewX', 'skewY',
  ];

  for (const prop of directProps) {
    if (state[prop as keyof ElementState] !== undefined) {
      result[prop] = state[prop as keyof ElementState];
    }
  }

  // Z → translateZ (3D)
  if (state.z !== undefined) {
    result.z = state.z;
  }

  // Origin
  if (state.originX !== undefined || state.originY !== undefined) {
    result.originX = state.originX ?? 0.5;
    result.originY = state.originY ?? 0.5;
  }

  // Colors
  if (state.backgroundColor !== undefined) {
    result.backgroundColor = state.backgroundColor;
  }
  if (state.borderColor !== undefined) {
    result.borderColor = state.borderColor;
  }
  if (state.color !== undefined) {
    result.color = state.color;
  }
  if (state.fill !== undefined) {
    result.fill = state.fill;
  }
  if (state.stroke !== undefined) {
    result.stroke = state.stroke;
  }

  // Dimensions
  if (state.width !== undefined) {
    result.width = state.width;
  }
  if (state.height !== undefined) {
    result.height = state.height;
  }

  // Border
  if (state.borderRadius !== undefined) {
    result.borderRadius = state.borderRadius;
  }
  if (state.borderWidth !== undefined) {
    result.borderWidth = state.borderWidth;
  }

  // SVG
  if (state.pathLength !== undefined) {
    result.pathLength = state.pathLength;
  }
  if (state.strokeWidth !== undefined) {
    result.strokeWidth = state.strokeWidth;
  }
  if (state.strokeDasharray !== undefined) {
    result.strokeDasharray = state.strokeDasharray;
  }
  if (state.strokeDashoffset !== undefined) {
    result.strokeDashoffset = state.strokeDashoffset;
  }

  // Filters - convert to filter string
  const filters: string[] = [];
  if (state.blur !== undefined) {
    filters.push(`blur(${state.blur}px)`);
  }
  if (state.brightness !== undefined) {
    filters.push(`brightness(${state.brightness})`);
  }
  if (state.contrast !== undefined) {
    filters.push(`contrast(${state.contrast})`);
  }
  if (state.saturate !== undefined) {
    filters.push(`saturate(${state.saturate})`);
  }
  if (state.hueRotate !== undefined) {
    filters.push(`hue-rotate(${state.hueRotate}deg)`);
  }
  if (state.grayscale !== undefined) {
    filters.push(`grayscale(${state.grayscale})`);
  }
  if (state.sepia !== undefined) {
    filters.push(`sepia(${state.sepia})`);
  }
  if (state.invert !== undefined) {
    filters.push(`invert(${state.invert})`);
  }
  if (filters.length > 0) {
    result.filter = filters.join(' ');
  }

  // Box shadow
  if (state.boxShadow !== undefined) {
    const shadows = Array.isArray(state.boxShadow)
      ? state.boxShadow
      : [state.boxShadow];
    result.boxShadow = shadows
      .map((s) => {
        const inset = s.inset ? 'inset ' : '';
        return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread ?? 0}px ${s.color}`;
      })
      .join(', ');
  }

  // Clip path
  if (state.clipPath !== undefined) {
    result.clipPath = state.clipPath;
  }

  return result as TargetAndTransition;
}

// ============================================================
// SPRING CONFIG CONVERSION
// ============================================================

export function convertSpringConfig(config: SpringConfig): Transition {
  if (config.preset) {
    const preset = SPRING_PRESETS[config.preset];
    return {
      type: 'spring',
      stiffness: config.stiffness ?? preset.stiffness,
      damping: config.damping ?? preset.damping,
      mass: config.mass ?? preset.mass,
      velocity: config.velocity,
      restDelta: config.restDelta,
      restSpeed: config.restSpeed,
    };
  }

  if (config.duration !== undefined) {
    return {
      type: 'spring',
      duration: config.duration / 1000, // ms to seconds
      bounce: config.bounce ?? 0.25,
    };
  }

  return {
    type: 'spring',
    stiffness: config.stiffness ?? 100,
    damping: config.damping ?? 10,
    mass: config.mass ?? 1,
    velocity: config.velocity,
    restDelta: config.restDelta,
    restSpeed: config.restSpeed,
  };
}

// ============================================================
// STAGGER CALCULATION
// ============================================================

export function calculateStaggerDelay(
  index: number,
  total: number,
  stagger: StaggerDefinition
): number {
  const from = stagger.from ?? 'first';
  let effectiveIndex = index;

  if (from === 'last') {
    effectiveIndex = total - 1 - index;
  } else if (from === 'center') {
    const center = (total - 1) / 2;
    effectiveIndex = Math.abs(index - center);
  } else if (from === 'edges') {
    const center = (total - 1) / 2;
    effectiveIndex = center - Math.abs(index - center);
  } else if (typeof from === 'number') {
    effectiveIndex = Math.abs(index - from);
  }

  return effectiveIndex * stagger.each;
}

// ============================================================
// INTERPRETER CLASS
// ============================================================

export class AnimationInterpreter {
  private dsl: KineticAnimation;
  private controls: ControlsMap = new Map();
  private state: InterpreterState = 'idle';
  private activeSequences: Set<string> = new Set();
  private abortController: AbortController | null = null;
  private eventHandlers: Set<InterpreterEventHandler> = new Set();
  private timeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(dsl: KineticAnimation) {
    this.dsl = dsl;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Register animation controls for an element
   */
  registerControl(elementId: string, control: AnimationControls): void {
    this.controls.set(elementId, control);
  }

  /**
   * Unregister animation controls for an element
   */
  unregisterControl(elementId: string): void {
    this.controls.delete(elementId);
  }

  /**
   * Get current interpreter state
   */
  getState(): InterpreterState {
    return this.state;
  }

  /**
   * Subscribe to interpreter events
   */
  on(handler: InterpreterEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Start playing all mount-triggered sequences
   */
  async play(): Promise<void> {
    if (this.state === 'playing') return;

    this.state = 'playing';
    this.abortController = new AbortController();
    this.emit({ type: 'stateChange', data: this.state });

    const mountSequences = this.dsl.timeline.sequences.filter(
      (seq) => seq.trigger.type === 'mount'
    );

    await Promise.all(
      mountSequences.map((seq) => this.executeSequence(seq))
    );
  }

  /**
   * Pause all active animations
   */
  pause(): void {
    if (this.state !== 'playing') return;

    this.state = 'paused';
    this.emit({ type: 'stateChange', data: this.state });

    // Clear all pending timeouts
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }

  /**
   * Resume paused animations
   */
  resume(): void {
    if (this.state !== 'paused') return;

    this.state = 'playing';
    this.emit({ type: 'stateChange', data: this.state });
    // Note: Resume logic would need to track progress - simplified for now
  }

  /**
   * Stop all animations and reset to initial state
   */
  async stop(): Promise<void> {
    this.state = 'stopped';
    this.abortController?.abort();
    this.abortController = null;
    this.activeSequences.clear();

    // Clear all pending timeouts
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Reset all elements to initial state
    await this.resetToInitial();

    this.state = 'idle';
    this.emit({ type: 'stateChange', data: this.state });
  }

  /**
   * Reset all elements to their initial state
   */
  async resetToInitial(): Promise<void> {
    for (const [elementId, element] of Object.entries(this.dsl.elements)) {
      const control = this.controls.get(elementId);
      if (control) {
        const initialState = convertStateToFramerMotion(element.initial);
        control.set(initialState);
      }
    }
  }

  /**
   * Trigger a sequence by ID
   */
  async triggerSequence(sequenceId: string): Promise<void> {
    const sequence = this.dsl.timeline.sequences.find(
      (seq) => seq.id === sequenceId
    );
    if (sequence) {
      await this.executeSequence(sequence);
    }
  }

  /**
   * Trigger sequences by trigger type
   */
  async triggerByType(
    triggerType: TriggerDefinition['type'],
    elementId?: string
  ): Promise<void> {
    const sequences = this.dsl.timeline.sequences.filter((seq) => {
      if (seq.trigger.type !== triggerType) return false;
      if (elementId && 'element' in seq.trigger) {
        return seq.trigger.element === elementId || !seq.trigger.element;
      }
      return true;
    });

    await Promise.all(sequences.map((seq) => this.executeSequence(seq)));
  }

  // ============================================================
  // SEQUENCE EXECUTION
  // ============================================================

  private async executeSequence(sequence: SequenceDefinition): Promise<void> {
    const sequenceId = sequence.id || crypto.randomUUID();

    if (this.activeSequences.has(sequenceId)) {
      return; // Already running
    }

    this.activeSequences.add(sequenceId);
    this.emit({ type: 'sequenceStart', data: { id: sequenceId } });

    // Handle trigger delay
    if (sequence.trigger.type === 'mount' && sequence.trigger.delay) {
      await this.delay(sequence.trigger.delay);
    }

    const runAnimations = async () => {
      for (const block of sequence.animations) {
        if (this.state === 'stopped') break;
        await this.executeAnimationBlock(block);
      }
    };

    // Handle repeat
    if (sequence.repeat) {
      const count =
        sequence.repeat.count === 'infinite' ? Infinity : sequence.repeat.count;
      let iteration = 0;

      while (iteration < count && this.state !== 'stopped') {
        await runAnimations();
        if (sequence.repeat.delay) {
          await this.delay(sequence.repeat.delay);
        }
        iteration++;
      }
    } else {
      await runAnimations();
    }

    this.activeSequences.delete(sequenceId);
    this.emit({ type: 'sequenceEnd', data: { id: sequenceId } });
  }

  private async executeAnimationBlock(block: AnimationBlock): Promise<void> {
    if (this.state === 'stopped') return;

    // Handle offset (wait before starting)
    if ('offset' in block && block.offset) {
      await this.delay(block.offset);
    }

    // Handle delay
    if ('delay' in block && block.delay) {
      await this.delay(block.delay);
    }

    this.emit({ type: 'animationStart', data: { type: block.type } });

    switch (block.type) {
      case 'spring':
        await this.executeSpring(block);
        break;
      case 'transition':
        await this.executeTransition(block);
        break;
      case 'keyframes':
        await this.executeKeyframes(block);
        break;
      case 'group':
        await this.executeGroup(block);
        break;
      case 'morph':
        await this.executeMorph(block);
        break;
      case 'particles':
        await this.executeParticles(block);
        break;
      case 'text':
        await this.executeText(block);
        break;
      default:
        console.warn(`Unknown animation type: ${(block as { type: string }).type}`);
    }

    this.emit({ type: 'animationEnd', data: { type: block.type } });
  }

  // ============================================================
  // ANIMATION TYPE HANDLERS
  // ============================================================

  private async executeSpring(
    block: Extract<AnimationBlock, { type: 'spring' }>
  ): Promise<void> {
    const targets = Array.isArray(block.target) ? block.target : [block.target];
    const transition = convertSpringConfig(block.spring);

    const animations = targets.map((targetId, index) => {
      const control = this.controls.get(targetId);
      if (!control) {
        console.warn(`No control registered for element: ${targetId}`);
        return Promise.resolve();
      }

      const staggerDelay = block.stagger
        ? calculateStaggerDelay(index, targets.length, block.stagger)
        : 0;

      return this.delay(staggerDelay).then(() =>
        control.start({
          ...convertStateToFramerMotion(block.to),
          transition,
        })
      );
    });

    await Promise.all(animations);
  }

  private async executeTransition(
    block: Extract<AnimationBlock, { type: 'transition' }>
  ): Promise<void> {
    const targets = Array.isArray(block.target) ? block.target : [block.target];
    const ease = convertEasing(block.easing);

    const transition: Transition = {
      duration: (block.duration ?? 300) / 1000,
      ease: ease ?? [0.25, 0.1, 0.25, 1],
    };

    const animations = targets.map((targetId, index) => {
      const control = this.controls.get(targetId);
      if (!control) {
        console.warn(`No control registered for element: ${targetId}`);
        return Promise.resolve();
      }

      const staggerDelay = block.stagger
        ? calculateStaggerDelay(index, targets.length, block.stagger)
        : 0;

      return this.delay(staggerDelay).then(() =>
        control.start({
          ...convertStateToFramerMotion(block.to),
          transition,
        })
      );
    });

    await Promise.all(animations);
  }

  private async executeKeyframes(
    block: Extract<AnimationBlock, { type: 'keyframes' }>
  ): Promise<void> {
    const targets = Array.isArray(block.target) ? block.target : [block.target];
    const duration = (block.duration ?? 1000) / 1000;

    // Convert keyframes to Framer Motion format
    // Framer Motion keyframes use arrays for each property
    const keyframeProperties: Record<string, unknown[]> = {};
    const times: number[] = [];

    for (const kf of block.keyframes) {
      times.push(kf.at / 100); // Convert 0-100 to 0-1

      const state = convertStateToFramerMotion(kf.state);
      for (const [prop, value] of Object.entries(state)) {
        if (!keyframeProperties[prop]) {
          keyframeProperties[prop] = [];
        }
        keyframeProperties[prop].push(value);
      }
    }

    const animateProps: Record<string, unknown> = {};
    for (const [prop, values] of Object.entries(keyframeProperties)) {
      animateProps[prop] = values;
    }

    const ease = convertEasing(block.easing);
    const transition: Transition = {
      duration,
      times,
      ease: ease ?? 'linear',
    };

    const animations = targets.map((targetId, index) => {
      const control = this.controls.get(targetId);
      if (!control) {
        console.warn(`No control registered for element: ${targetId}`);
        return Promise.resolve();
      }

      const staggerDelay = block.stagger
        ? calculateStaggerDelay(index, targets.length, block.stagger)
        : 0;

      return this.delay(staggerDelay).then(() =>
        control.start({
          ...animateProps,
          transition,
        })
      );
    });

    await Promise.all(animations);
  }

  private async executeGroup(
    block: Extract<AnimationBlock, { type: 'group' }>
  ): Promise<void> {
    if (block.mode === 'parallel') {
      await Promise.all(
        block.animations.map((anim) => this.executeAnimationBlock(anim))
      );
    } else {
      // Sequential
      for (const anim of block.animations) {
        await this.executeAnimationBlock(anim);
        if (block.stagger) {
          await this.delay(block.stagger.each);
        }
      }
    }
  }

  private async executeMorph(
    block: Extract<AnimationBlock, { type: 'morph' }>
  ): Promise<void> {
    // Morph requires flubber library - placeholder for now
    const control = this.controls.get(block.target);
    if (!control) {
      console.warn(`No control registered for element: ${block.target}`);
      return;
    }

    const duration = (block.duration ?? 500) / 1000;
    const ease = convertEasing(block.easing);

    // For now, just animate the d attribute directly
    // Real implementation would use flubber interpolation
    await control.start({
      d: block.to,
      transition: {
        duration,
        ease: ease ?? [0.25, 0.1, 0.25, 1],
      },
    });
  }

  private async executeParticles(
    block: Extract<AnimationBlock, { type: 'particles' }>
  ): Promise<void> {
    // Particles use canvas-confetti - handled in component
    // This is a placeholder that just waits for duration
    if (block.duration) {
      await this.delay(block.duration);
    }
  }

  private async executeText(
    block: Extract<AnimationBlock, { type: 'text' }>
  ): Promise<void> {
    // Text animations require special handling in component
    // This is a placeholder that just waits for duration
    if (block.duration) {
      await this.delay(block.duration);
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      this.timeouts.add(timeout);
      // Clean up after resolve
      setTimeout(() => this.timeouts.delete(timeout), ms + 1);
    });
  }

  private emit(event: InterpreterEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Error in event handler:', e);
      }
    }
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

/**
 * Create a new animation interpreter
 */
export function createInterpreter(dsl: KineticAnimation): AnimationInterpreter {
  return new AnimationInterpreter(dsl);
}
