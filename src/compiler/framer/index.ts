/**
 * Framer Motion Compiler
 * Compiles Kinetic DSL to React + Framer Motion components
 */

import type {
  KineticAnimation,
  ElementDefinition,
  ElementState,
  SequenceDefinition,
  AnimationBlock,
  EasingDefinition,
  SpringConfig,
  TriggerDefinition,
} from '@/dsl/schema';
import { SPRING_PRESETS } from '@/dsl/parser';

// ============================================================
// TYPES
// ============================================================

export type CompilerOutput = {
  code: string;
  language: 'tsx';
  dependencies: Record<string, string>;
  files?: { name: string; content: string }[];
};

export type CompilerOptions = {
  componentName?: string;
  includeTypes?: boolean;
  useClientDirective?: boolean;
  exportDefault?: boolean;
};

// ============================================================
// HELPERS
// ============================================================

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, '_$&');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function indent(str: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

// ============================================================
// STATE CONVERSION
// ============================================================

function stateToObject(state: Partial<ElementState>): string {
  const props: string[] = [];

  // Direct mappings
  const directProps = [
    'x', 'y', 'opacity', 'scale', 'scaleX', 'scaleY',
    'rotate', 'rotateX', 'rotateY', 'rotateZ',
    'skewX', 'skewY', 'width', 'height',
    'borderRadius', 'borderWidth', 'pathLength',
    'strokeWidth', 'strokeDashoffset',
  ];

  for (const prop of directProps) {
    const value = state[prop as keyof ElementState];
    if (value !== undefined) {
      if (typeof value === 'string') {
        props.push(`${prop}: "${value}"`);
      } else {
        props.push(`${prop}: ${value}`);
      }
    }
  }

  // Colors
  const colorProps = ['backgroundColor', 'borderColor', 'color', 'fill', 'stroke'];
  for (const prop of colorProps) {
    const value = state[prop as keyof ElementState];
    if (value !== undefined) {
      props.push(`${prop}: "${value}"`);
    }
  }

  // Filters
  const filters: string[] = [];
  if (state.blur !== undefined) filters.push(`blur(${state.blur}px)`);
  if (state.brightness !== undefined) filters.push(`brightness(${state.brightness})`);
  if (state.contrast !== undefined) filters.push(`contrast(${state.contrast})`);
  if (state.saturate !== undefined) filters.push(`saturate(${state.saturate})`);
  if (state.hueRotate !== undefined) filters.push(`hue-rotate(${state.hueRotate}deg)`);
  if (state.grayscale !== undefined) filters.push(`grayscale(${state.grayscale})`);
  if (state.sepia !== undefined) filters.push(`sepia(${state.sepia})`);
  if (state.invert !== undefined) filters.push(`invert(${state.invert})`);
  if (filters.length > 0) {
    props.push(`filter: "${filters.join(' ')}"`);
  }

  // Box shadow
  if (state.boxShadow) {
    const shadows = Array.isArray(state.boxShadow)
      ? state.boxShadow
      : [state.boxShadow];
    const shadowStr = shadows
      .map((s) => {
        const inset = s.inset ? 'inset ' : '';
        return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread ?? 0}px ${s.color}`;
      })
      .join(', ');
    props.push(`boxShadow: "${shadowStr}"`);
  }

  // Origin
  if (state.originX !== undefined || state.originY !== undefined) {
    props.push(`originX: ${state.originX ?? 0.5}`);
    props.push(`originY: ${state.originY ?? 0.5}`);
  }

  return `{ ${props.join(', ')} }`;
}

// ============================================================
// EASING CONVERSION
// ============================================================

function easingToCode(easing: EasingDefinition | undefined): string {
  if (!easing) return '"easeOut"';

  if (typeof easing === 'string') {
    return `"${easing}"`;
  }

  if (easing.type === 'cubicBezier') {
    return `[${easing.values.join(', ')}]`;
  }

  if (easing.type === 'steps') {
    // Framer Motion doesn't support steps, return linear
    return '"linear"';
  }

  return '"easeOut"';
}

// ============================================================
// SPRING CONVERSION
// ============================================================

function springToCode(config: SpringConfig): string {
  if (config.preset) {
    const preset = SPRING_PRESETS[config.preset];
    return `{ type: "spring", stiffness: ${preset.stiffness}, damping: ${preset.damping}, mass: ${preset.mass} }`;
  }

  if (config.duration !== undefined) {
    return `{ type: "spring", duration: ${config.duration / 1000}, bounce: ${config.bounce ?? 0.25} }`;
  }

  const props: string[] = ['type: "spring"'];
  if (config.stiffness !== undefined) props.push(`stiffness: ${config.stiffness}`);
  if (config.damping !== undefined) props.push(`damping: ${config.damping}`);
  if (config.mass !== undefined) props.push(`mass: ${config.mass}`);
  if (config.velocity !== undefined) props.push(`velocity: ${config.velocity}`);

  return `{ ${props.join(', ')} }`;
}

// ============================================================
// COMPILER CLASS
// ============================================================

export class FramerMotionCompiler {
  private dsl: KineticAnimation;
  private options: Required<CompilerOptions>;
  private imports: Set<string> = new Set(['motion']);
  private hooks: string[] = [];
  private effects: string[] = [];
  private handlers: string[] = [];
  private variants: Map<string, string> = new Map();

  constructor(dsl: KineticAnimation, options: CompilerOptions = {}) {
    this.dsl = dsl;
    this.options = {
      componentName: options.componentName || this.getComponentName(),
      includeTypes: options.includeTypes ?? true,
      useClientDirective: options.useClientDirective ?? true,
      exportDefault: options.exportDefault ?? true,
    };
  }

  private getComponentName(): string {
    const name = this.dsl.meta?.name || 'KineticAnimation';
    return sanitizeName(capitalize(name));
  }

  compile(): CompilerOutput {
    this.imports = new Set(['motion']);
    this.hooks = [];
    this.effects = [];
    this.handlers = [];
    this.variants = new Map();

    // Analyze what we need
    this.analyzeSequences();

    // Generate code
    const code = this.generateComponent();

    return {
      code,
      language: 'tsx',
      dependencies: {
        'framer-motion': '^11.0.0',
        react: '^18.0.0',
      },
    };
  }

  private analyzeSequences(): void {
    for (const sequence of this.dsl.timeline.sequences) {
      this.analyzeSequence(sequence);
    }
  }

  private analyzeSequence(sequence: SequenceDefinition): void {
    const trigger = sequence.trigger;

    switch (trigger.type) {
      case 'mount':
        // Will use initial + animate
        break;
      case 'hover':
      case 'hoverEnd':
        // Will use whileHover
        break;
      case 'tap':
        // Will use whileTap
        break;
      case 'inView':
        this.imports.add('useInView');
        break;
      case 'scroll':
        this.imports.add('useScroll');
        this.imports.add('useTransform');
        break;
      case 'drag':
        // Will use drag prop
        break;
    }

    // Check for useAnimation needs
    const needsControls = sequence.animations.some(
      (anim) => anim.type === 'group' || sequence.repeat !== undefined
    );
    if (needsControls) {
      this.imports.add('useAnimation');
    }
  }

  private generateComponent(): string {
    const { componentName, useClientDirective, exportDefault, includeTypes } = this.options;

    const sections: string[] = [];

    // Client directive
    if (useClientDirective) {
      sections.push("'use client';");
      sections.push('');
    }

    // Imports
    sections.push(this.generateImports());
    sections.push('');

    // Variables if any
    if (this.dsl.variables && Object.keys(this.dsl.variables).length > 0) {
      sections.push(`const variables = ${JSON.stringify(this.dsl.variables, null, 2)};`);
      sections.push('');
    }

    // Component
    const componentBody = this.generateComponentBody();
    const exportStr = exportDefault ? 'export default ' : 'export ';

    sections.push(`${exportStr}function ${componentName}() {`);
    sections.push(indent(componentBody, 2));
    sections.push('}');

    return sections.join('\n');
  }

  private generateImports(): string {
    const framerImports = Array.from(this.imports).sort();
    const lines: string[] = [];

    lines.push(`import { ${framerImports.join(', ')} } from 'framer-motion';`);

    if (this.effects.length > 0 || this.hooks.some((h) => h.includes('useEffect'))) {
      lines.push("import { useEffect } from 'react';");
    }

    return lines.join('\n');
  }

  private generateComponentBody(): string {
    const lines: string[] = [];

    // Generate useAnimation hooks for elements that need them
    const elementsNeedingControls = new Set<string>();
    for (const sequence of this.dsl.timeline.sequences) {
      for (const anim of sequence.animations) {
        if ('target' in anim) {
          const targets = Array.isArray(anim.target) ? anim.target : [anim.target];
          targets.forEach((t) => elementsNeedingControls.add(t));
        }
      }
    }

    if (this.imports.has('useAnimation')) {
      for (const elementId of elementsNeedingControls) {
        lines.push(`const controls${capitalize(elementId)} = useAnimation();`);
      }
      lines.push('');
    }

    // Generate mount effects
    const mountSequences = this.dsl.timeline.sequences.filter(
      (seq) => seq.trigger.type === 'mount'
    );
    if (mountSequences.length > 0) {
      lines.push('useEffect(() => {');
      lines.push('  const animate = async () => {');
      for (const seq of mountSequences) {
        const delay = seq.trigger.type === 'mount' && seq.trigger.delay;
        if (delay) {
          lines.push(`    await new Promise(r => setTimeout(r, ${delay}));`);
        }
        lines.push(this.generateSequenceCode(seq, '    '));
      }
      lines.push('  };');
      lines.push('  animate();');
      lines.push('}, []);');
      lines.push('');
    }

    // Generate event handlers for hover/tap sequences
    const hoverSequences = this.dsl.timeline.sequences.filter(
      (seq) => seq.trigger.type === 'hover'
    );
    const tapSequences = this.dsl.timeline.sequences.filter(
      (seq) => seq.trigger.type === 'tap'
    );

    // JSX
    lines.push('return (');
    lines.push('  <div className="relative">');

    for (const [elementId, element] of Object.entries(this.dsl.elements)) {
      lines.push(this.generateElementJSX(elementId, element, '    '));
    }

    lines.push('  </div>');
    lines.push(');');

    return lines.join('\n');
  }

  private generateSequenceCode(sequence: SequenceDefinition, indent: string): string {
    const lines: string[] = [];

    for (const anim of sequence.animations) {
      lines.push(this.generateAnimationCode(anim, indent));
    }

    return lines.join('\n');
  }

  private generateAnimationCode(anim: AnimationBlock, ind: string): string {
    switch (anim.type) {
      case 'spring': {
        const targets = Array.isArray(anim.target) ? anim.target : [anim.target];
        const springCode = springToCode(anim.spring);
        const toState = stateToObject(anim.to);

        return targets
          .map((t) =>
            `${ind}await controls${capitalize(t)}.start({ ...${toState}, transition: ${springCode} });`
          )
          .join('\n');
      }

      case 'transition': {
        const targets = Array.isArray(anim.target) ? anim.target : [anim.target];
        const toState = stateToObject(anim.to);
        const duration = (anim.duration ?? 300) / 1000;
        const easing = easingToCode(anim.easing);

        return targets
          .map((t) =>
            `${ind}await controls${capitalize(t)}.start({ ...${toState}, transition: { duration: ${duration}, ease: ${easing} } });`
          )
          .join('\n');
      }

      case 'group': {
        if (anim.mode === 'parallel') {
          const animCodes = anim.animations
            .map((a) => this.generateAnimationCode(a, ind + '  ').trim())
            .join(',\n' + ind + '  ');
          return `${ind}await Promise.all([\n${ind}  ${animCodes}\n${ind}]);`;
        } else {
          return anim.animations
            .map((a) => this.generateAnimationCode(a, ind))
            .join('\n');
        }
      }

      default:
        return `${ind}// TODO: ${anim.type} animation`;
    }
  }

  private generateElementJSX(
    elementId: string,
    element: ElementDefinition,
    ind: string
  ): string {
    const tag = this.getMotionTag(element.type);
    const initialState = stateToObject(element.initial);

    // Find hover/tap variants for this element
    const hoverSeq = this.dsl.timeline.sequences.find(
      (seq) =>
        seq.trigger.type === 'hover' &&
        (seq.trigger.element === elementId || !seq.trigger.element)
    );
    const tapSeq = this.dsl.timeline.sequences.find(
      (seq) =>
        seq.trigger.type === 'tap' &&
        (seq.trigger.element === elementId || !seq.trigger.element)
    );

    const props: string[] = [];
    props.push(`initial={${initialState}}`);

    if (this.imports.has('useAnimation')) {
      props.push(`animate={controls${capitalize(elementId)}}`);
    }

    // Add hover variant if exists
    if (hoverSeq && hoverSeq.animations.length > 0) {
      const firstAnim = hoverSeq.animations[0];
      if ('to' in firstAnim) {
        props.push(`whileHover={${stateToObject(firstAnim.to)}}`);
      }
    }

    // Add tap variant if exists
    if (tapSeq && tapSeq.animations.length > 0) {
      const firstAnim = tapSeq.animations[0];
      if ('to' in firstAnim) {
        props.push(`whileTap={${stateToObject(firstAnim.to)}}`);
      }
    }

    // Add element-specific props
    if (element.type === 'text' && 'content' in element) {
      const content = (element as { content: string }).content;
      return `${ind}<${tag}\n${ind}  ${props.join(`\n${ind}  `)}\n${ind}  className="absolute"\n${ind}>\n${ind}  ${content}\n${ind}</${tag.split('.')[1] || 'div'}>`;
    }

    if (element.type === 'path' && 'd' in element) {
      props.push(`d="${(element as { d: string }).d}"`);
    }

    return `${ind}<${tag}\n${ind}  ${props.join(`\n${ind}  `)}\n${ind}  className="absolute"\n${ind}/>`;
  }

  private getMotionTag(elementType: string): string {
    switch (elementType) {
      case 'text':
        return 'motion.span';
      case 'svg':
        return 'motion.svg';
      case 'path':
        return 'motion.path';
      case 'circle':
        return 'motion.div'; // styled as circle
      default:
        return 'motion.div';
    }
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

/**
 * Compile DSL to Framer Motion React component
 */
export function compileToFramerMotion(
  dsl: KineticAnimation,
  options?: CompilerOptions
): CompilerOutput {
  const compiler = new FramerMotionCompiler(dsl, options);
  return compiler.compile();
}
