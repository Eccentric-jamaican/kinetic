/**
 * Kinetic Runtime Module
 * Animation interpreter and utilities
 */

export {
  AnimationInterpreter,
  createInterpreter,
  convertStateToFramerMotion,
  convertSpringConfig,
  convertEasing,
  calculateStaggerDelay,
} from './interpreter';

export type {
  ControlsMap,
  InterpreterState,
  InterpreterEvent,
  InterpreterEventHandler,
} from './interpreter';

export {
  // Basic easing
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  // Back
  easeInBack,
  easeOutBack,
  easeInOutBack,
  // Elastic
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  // Bounce
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  // Utils
  cubicBezier,
  springEasing,
  easingFunctions,
  getEasingFunction,
} from './easing';

export type { EasingFunction } from './easing';
