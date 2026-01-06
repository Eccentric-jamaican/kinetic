/**
 * Kinetic CSS Compiler
 * Converts DSL animations to pure CSS with @keyframes and transitions
 */

import type {
  KineticAnimation,
  ElementState,
  AnimationBlock,
  SpringConfig,
  EasingDefinition,
  ShadowDefinition,
} from '@/dsl/schema';

// ============================================================
// TYPES
// ============================================================

export type CSSCompilerOptions = {
  prefix?: string;
  includeComments?: boolean;
};

export type CSSCompilerOutput = {
  code: string;
  language: 'css';
  warnings: string[];
};

// ============================================================
// SPRING TO CUBIC-BEZIER APPROXIMATION
// ============================================================

const SPRING_BEZIERS: Record<string, string> = {
  gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  wobbly: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  stiff: 'cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'cubic-bezier(0.4, 0, 0.2, 1)',
  molasses: 'cubic-bezier(0.4, 0, 0.6, 1)',
  bouncy: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
};

const SPRING_DURATIONS: Record<string, number> = {
  gentle: 0.6,
  wobbly: 0.8,
  stiff: 0.3,
  slow: 1.0,
  molasses: 1.5,
  bouncy: 0.6,
};

function springToCubicBezier(spring: SpringConfig): string {
  if (typeof spring === 'string') {
    return SPRING_BEZIERS[spring] || 'cubic-bezier(0.4, 0, 0.2, 1)';
  }

  const { stiffness = 100, damping = 10, mass = 1 } = spring;
  const ratio = damping / (2 * Math.sqrt(stiffness * mass));

  if (ratio < 0.5) return 'cubic-bezier(0.68, -0.6, 0.32, 1.6)';
  if (ratio < 1) return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  return 'cubic-bezier(0.4, 0, 0.2, 1)';
}

function springToDuration(spring: SpringConfig): number {
  if (typeof spring === 'string') {
    return SPRING_DURATIONS[spring] || 0.5;
  }
  const { stiffness = 100, mass = 1 } = spring;
  return Math.min(2, Math.max(0.2, (4 * Math.PI) / Math.sqrt(stiffness / mass)));
}

// ============================================================
// EASING TO CSS
// ============================================================

const EASING_MAP: Record<string, string> = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
};

function easingToCSS(easing: EasingDefinition): string {
  if (typeof easing === 'string') {
    return EASING_MAP[easing] || 'ease';
  }
  if (Array.isArray(easing)) {
    return `cubic-bezier(${easing.join(', ')})`;
  }
  if (typeof easing === 'object' && 'type' in easing) {
    if (easing.type === 'steps' && 'count' in easing) {
      return `steps(${easing.count}, ${easing.position || 'end'})`;
    }
  }
  return 'ease';
}

// ============================================================
// STATE TO CSS
// ============================================================

function formatValue(value: unknown, prop: string): string {
  if (typeof value !== 'number') return String(value);

  const pxProps = ['x', 'y', 'z', 'width', 'height', 'borderRadius', 'borderWidth', 'blur', 'strokeWidth'];
  const degProps = ['rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY', 'hueRotate'];

  if (pxProps.includes(prop)) return `${value}px`;
  if (degProps.includes(prop)) return `${value}deg`;
  return String(value);
}

function stateToCSS(state: Partial<ElementState>): Record<string, string> {
  const css: Record<string, string> = {};
  const transforms: string[] = [];
  const filters: string[] = [];

  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      // Transforms
      case 'x': transforms.push(`translateX(${formatValue(value, key)})`); break;
      case 'y': transforms.push(`translateY(${formatValue(value, key)})`); break;
      case 'z': transforms.push(`translateZ(${formatValue(value, key)})`); break;
      case 'scale': transforms.push(`scale(${value})`); break;
      case 'scaleX': transforms.push(`scaleX(${value})`); break;
      case 'scaleY': transforms.push(`scaleY(${value})`); break;
      case 'rotate': transforms.push(`rotate(${formatValue(value, key)})`); break;
      case 'rotateX': transforms.push(`rotateX(${formatValue(value, key)})`); break;
      case 'rotateY': transforms.push(`rotateY(${formatValue(value, key)})`); break;
      case 'rotateZ': transforms.push(`rotateZ(${formatValue(value, key)})`); break;
      case 'skewX': transforms.push(`skewX(${formatValue(value, key)})`); break;
      case 'skewY': transforms.push(`skewY(${formatValue(value, key)})`); break;

      // Filters
      case 'blur': filters.push(`blur(${formatValue(value, key)})`); break;
      case 'brightness': filters.push(`brightness(${value})`); break;
      case 'contrast': filters.push(`contrast(${value})`); break;
      case 'saturate': filters.push(`saturate(${value})`); break;
      case 'grayscale': filters.push(`grayscale(${value})`); break;
      case 'hueRotate': filters.push(`hue-rotate(${formatValue(value, key)})`); break;

      // Direct properties
      case 'opacity': css['opacity'] = String(value); break;
      case 'backgroundColor': css['background-color'] = String(value); break;
      case 'borderColor': css['border-color'] = String(value); break;
      case 'borderRadius': css['border-radius'] = formatValue(value, key); break;
      case 'borderWidth': css['border-width'] = formatValue(value, key); break;
      case 'color': css['color'] = String(value); break;
      case 'width': css['width'] = formatValue(value, key); break;
      case 'height': css['height'] = formatValue(value, key); break;
      case 'fill': css['fill'] = String(value); break;
      case 'stroke': css['stroke'] = String(value); break;
      case 'strokeWidth': css['stroke-width'] = formatValue(value, key); break;
      case 'clipPath': css['clip-path'] = String(value); break;

      case 'boxShadow':
        if (typeof value === 'object') {
          const s = value as ShadowDefinition;
          const inset = s.inset ? 'inset ' : '';
          css['box-shadow'] = `${inset}${s.x || 0}px ${s.y || 0}px ${s.blur || 0}px ${s.spread || 0}px ${s.color || '#000'}`;
        }
        break;
    }
  }

  if (transforms.length > 0) css['transform'] = transforms.join(' ');
  if (filters.length > 0) css['filter'] = filters.join(' ');

  return css;
}

function propsToString(props: Record<string, string>, indent = '  '): string {
  return Object.entries(props).map(([k, v]) => `${indent}${k}: ${v};`).join('\n');
}

// ============================================================
// CSS COMPILER
// ============================================================

export class CSSCompiler {
  private dsl: KineticAnimation;
  private prefix: string;
  private includeComments: boolean;
  private warnings: string[] = [];
  private keyframes: string[] = [];

  constructor(dsl: KineticAnimation, options: CSSCompilerOptions = {}) {
    this.dsl = dsl;
    this.prefix = options.prefix ?? 'kinetic';
    this.includeComments = options.includeComments ?? true;
  }

  compile(): CSSCompilerOutput {
    this.checkJSFeatures();
    const sections: string[] = [];

    if (this.includeComments) {
      sections.push('/* Generated by Kinetic CSS Compiler */\n');
    }

    // Generate element styles
    for (const [id, element] of Object.entries(this.dsl.elements || {})) {
      sections.push(this.generateElement(id, element));
    }

    // Add keyframes
    if (this.keyframes.length > 0) {
      sections.push('\n/* Keyframe Animations */');
      sections.push(...this.keyframes);
    }

    // Add warnings
    if (this.warnings.length > 0 && this.includeComments) {
      sections.push('\n/*');
      sections.push(' * NOTE: Some features require JavaScript:');
      this.warnings.forEach(w => sections.push(` * - ${w}`));
      sections.push(' */');
    }

    return { code: sections.join('\n'), language: 'css', warnings: this.warnings };
  }

  private generateElement(id: string, element: { initial?: Partial<ElementState> }): string {
    const cls = `.${this.prefix}-${id}`;
    const base = stateToCSS(element.initial || {});
    const lines: string[] = [];

    // Find animations for this element
    const hover = this.findAnimation(id, 'hover');
    const focus = this.findAnimation(id, 'focus');
    const tap = this.findAnimation(id, 'tap');
    const mount = this.findAnimation(id, 'mount');

    // Build transition
    const transitions = this.buildTransitions(id);
    if (transitions) base['transition'] = transitions;

    // Mount animation
    if (mount?.keyframeName) {
      base['animation'] = `${mount.keyframeName} ${mount.duration}s ${mount.easing} forwards`;
    }

    if (this.includeComments) lines.push(`/* ${id} */`);
    lines.push(`${cls} {`);
    lines.push(propsToString(base));
    lines.push('}\n');

    // Hover
    if (hover) {
      lines.push(`${cls}:hover {`);
      lines.push(propsToString(stateToCSS(hover.toState)));
      lines.push('}\n');
    }

    // Focus
    if (focus) {
      lines.push(`${cls}:focus {`);
      lines.push(propsToString(stateToCSS(focus.toState)));
      lines.push('}\n');
    }

    // Active (tap)
    if (tap) {
      lines.push(`${cls}:active {`);
      lines.push(propsToString(stateToCSS(tap.toState)));
      lines.push('}\n');
    }

    return lines.join('\n');
  }

  private findAnimation(elementId: string, trigger: string): {
    toState: Partial<ElementState>;
    duration: number;
    easing: string;
    keyframeName?: string;
  } | null {
    for (const seq of this.dsl.timeline?.sequences || []) {
      if (seq.trigger?.type !== trigger) continue;

      for (const anim of seq.animations || []) {
        // Skip animations without target or that don't match our element
        if (!('target' in anim) || anim.target !== elementId) continue;

        let duration = 0.3;
        let easing = 'ease';
        const toState = ('to' in anim ? anim.to : {}) as Partial<ElementState>;

        if (anim.type === 'spring' && 'spring' in anim) {
          easing = springToCubicBezier(anim.spring as SpringConfig);
          duration = springToDuration(anim.spring as SpringConfig);
        } else if (anim.type === 'transition' && 'transition' in anim) {
          const t = anim.transition as { duration?: number; easing?: EasingDefinition };
          duration = t.duration || 0.3;
          easing = t.easing ? easingToCSS(t.easing) : 'ease';
        } else if (anim.type === 'keyframes' && 'keyframes' in anim) {
          const name = this.generateKeyframe(elementId, trigger, anim);
          return { toState: {}, duration: (anim as { duration?: number }).duration || 1, easing: 'linear', keyframeName: name };
        }

        return { toState, duration, easing };
      }
    }
    return null;
  }

  private generateKeyframe(elementId: string, trigger: string, anim: AnimationBlock): string {
    if (!('keyframes' in anim)) return '';

    const name = `${this.prefix}-${elementId}-${trigger}`;
    const kfs = anim.keyframes as Array<{ at: number; state: Partial<ElementState> }>;

    const lines = [`@keyframes ${name} {`];
    for (const kf of kfs) {
      lines.push(`  ${kf.at}% {`);
      lines.push(propsToString(stateToCSS(kf.state), '    '));
      lines.push('  }');
    }
    lines.push('}');

    this.keyframes.push(lines.join('\n'));
    return name;
  }

  private buildTransitions(elementId: string): string | null {
    const parts: Set<string> = new Set();

    for (const seq of this.dsl.timeline?.sequences || []) {
      if (!['hover', 'hoverEnd', 'focus', 'blur', 'tap'].includes(seq.trigger?.type || '')) continue;

      for (const anim of seq.animations || []) {
        // Skip animations without target or that don't match our element
        if (!('target' in anim) || anim.target !== elementId || anim.type === 'keyframes') continue;

        let duration = 0.3;
        let easing = 'ease';

        if (anim.type === 'spring' && 'spring' in anim) {
          easing = springToCubicBezier(anim.spring as SpringConfig);
          duration = springToDuration(anim.spring as SpringConfig);
        } else if (anim.type === 'transition' && 'transition' in anim) {
          const t = anim.transition as { duration?: number; easing?: EasingDefinition };
          duration = t.duration || 0.3;
          easing = t.easing ? easingToCSS(t.easing) : 'ease';
        }

        const cssProps = stateToCSS(('to' in anim ? anim.to : {}) as Partial<ElementState>);
        for (const prop of Object.keys(cssProps)) {
          parts.add(`${prop} ${duration}s ${easing}`);
        }
      }
    }

    return parts.size > 0 ? [...parts].join(', ') : null;
  }

  private checkJSFeatures(): void {
    const jsOnlyTriggers: Record<string, string> = {
      scroll: 'Scroll animations require JavaScript',
      inView: 'InView detection requires JavaScript (Intersection Observer)',
      drag: 'Drag interactions require JavaScript',
      audio: 'Audio sync requires JavaScript (Web Audio API)',
      state: 'State machines require JavaScript',
      custom: 'Custom triggers require JavaScript',
    };

    for (const seq of this.dsl.timeline?.sequences || []) {
      const t = seq.trigger?.type;
      if (t && jsOnlyTriggers[t]) this.warnings.push(jsOnlyTriggers[t]);

      for (const anim of seq.animations || []) {
        if (anim.type === 'morph') this.warnings.push('SVG morphing requires JavaScript');
        if (anim.type === 'particles') this.warnings.push('Particles require JavaScript');
        if (anim.type === 'matchCut') this.warnings.push('Match cuts require JavaScript');
      }
    }

    if (this.dsl.stateMachine) {
      this.warnings.push('State machines require JavaScript');
    }
    if (this.dsl.audio) this.warnings.push('Audio sync requires JavaScript');
  }
}

// ============================================================
// EXPORT
// ============================================================

export function compileToCSS(dsl: KineticAnimation, options?: CSSCompilerOptions): CSSCompilerOutput {
  return new CSSCompiler(dsl, options).compile();
}
