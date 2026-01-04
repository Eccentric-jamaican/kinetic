'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useEditorStore } from '@/store';
import { createInterpreter, convertStateToFramerMotion } from '@/runtime';
import type { ElementDefinition } from '@/dsl/schema';

export function PreviewPanel() {
  const { dsl, previewState, setPreviewState } = useEditorStore();
  const interpreterRef = useRef<ReturnType<typeof createInterpreter> | null>(null);
  const controlsRef = useRef<Map<string, ReturnType<typeof useAnimation>>>(new Map());

  // Reset preview
  const handleReset = useCallback(async () => {
    if (interpreterRef.current) {
      await interpreterRef.current.stop();
    }
    setPreviewState('idle');
  }, [setPreviewState]);

  // Play preview
  const handlePlay = useCallback(async () => {
    if (!dsl) return;

    // Create new interpreter
    interpreterRef.current = createInterpreter(dsl);

    // Register controls
    for (const [id, controls] of controlsRef.current) {
      interpreterRef.current.registerControl(id, controls);
    }

    setPreviewState('playing');
    await interpreterRef.current.play();
    setPreviewState('idle');
  }, [dsl, setPreviewState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      interpreterRef.current?.stop();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-medium text-zinc-300">Preview</span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={handlePlay}
            disabled={previewState === 'playing'}
            className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        {/* Checkered background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #888 25%, transparent 25%),
              linear-gradient(-45deg, #888 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #888 75%),
              linear-gradient(-45deg, transparent 75%, #888 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Animation container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimationPreview
            dsl={dsl}
            controlsRef={controlsRef}
          />
        </div>

        {/* State indicator */}
        {previewState === 'playing' && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Playing
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="h-8 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-500 shrink-0">
        <span>
          {Object.keys(dsl?.elements || {}).length} element(s) •{' '}
          {dsl?.timeline?.sequences?.length || 0} sequence(s)
        </span>
      </div>
    </div>
  );
}

// Separate component for the actual animation preview
function AnimationPreview({
  dsl,
  controlsRef,
}: {
  dsl: ReturnType<typeof useEditorStore.getState>['dsl'];
  controlsRef: React.MutableRefObject<Map<string, ReturnType<typeof useAnimation>>>;
}) {
  if (!dsl || !dsl.elements || Object.keys(dsl.elements).length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center">
        <p>No elements to preview</p>
        <p className="text-xs mt-1">Add elements via the prompt or DSL editor</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: 400, height: 400 }}>
      {Object.entries(dsl.elements).map(([id, element]) => (
        <ElementRenderer
          key={id}
          id={id}
          element={element}
          controlsRef={controlsRef}
        />
      ))}
    </div>
  );
}

// Individual element renderer
function ElementRenderer({
  id,
  element,
  controlsRef,
}: {
  id: string;
  element: ElementDefinition;
  controlsRef: React.MutableRefObject<Map<string, ReturnType<typeof useAnimation>>>;
}) {
  const controls = useAnimation();

  // Register controls
  useEffect(() => {
    controlsRef.current.set(id, controls);
    return () => {
      controlsRef.current.delete(id);
    };
  }, [id, controls, controlsRef]);

  const initialState = convertStateToFramerMotion(element.initial);

  // Get element-specific styles
  const getElementStyles = () => {
    const base: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (element.type === 'circle') {
      base.borderRadius = '50%';
    }

    return base;
  };

  const getContent = () => {
    if (element.type === 'text' && 'content' in element) {
      return (element as { content: string }).content;
    }
    return null;
  };

  return (
    <motion.div
      initial={initialState}
      animate={controls}
      style={getElementStyles()}
      className="cursor-pointer"
    >
      {getContent()}
    </motion.div>
  );
}
