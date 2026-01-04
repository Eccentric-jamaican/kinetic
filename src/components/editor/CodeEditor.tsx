'use client';

import { useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/store';
import { compileToFramerMotion } from '@/compiler/framer';

export function CodeEditor() {
  const {
    dslJson,
    dsl,
    activeTab,
    validationErrors,
    setDslJson,
    updateDslFromJson,
    setActiveTab,
  } = useEditorStore();

  const [compiledCode, setCompiledCode] = useState('');

  // Compile when tab changes or DSL updates
  useEffect(() => {
    if (activeTab === 'framer' && dsl) {
      try {
        const result = compileToFramerMotion(dsl);
        setCompiledCode(result.code);
      } catch (e) {
        setCompiledCode(`// Compilation error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
  }, [activeTab, dsl]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setDslJson(value);
      }
    },
    [setDslJson]
  );

  const handleValidate = useCallback(() => {
    updateDslFromJson();
  }, [updateDslFromJson]);

  const tabs = [
    { id: 'dsl' as const, label: 'DSL' },
    { id: 'framer' as const, label: 'Framer Motion' },
    { id: 'css' as const, label: 'CSS' },
  ];

  const getEditorContent = () => {
    switch (activeTab) {
      case 'dsl':
        return dslJson;
      case 'framer':
        return compiledCode;
      case 'css':
        return '/* CSS compiler coming soon */';
      default:
        return dslJson;
    }
  };

  const getLanguage = () => {
    switch (activeTab) {
      case 'dsl':
        return 'json';
      case 'framer':
        return 'typescript';
      case 'css':
        return 'css';
      default:
        return 'json';
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header with tabs */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-2 shrink-0">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {activeTab === 'dsl' && (
            <>
              <button
                onClick={handleValidate}
                className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Validate
              </button>
              <button
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(JSON.parse(dslJson), null, 2);
                    setDslJson(formatted);
                  } catch {
                    // Invalid JSON, skip formatting
                  }
                }}
                className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Format
              </button>
            </>
          )}
          {activeTab !== 'dsl' && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(getEditorContent());
              }}
              className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && activeTab === 'dsl' && (
        <div className="bg-red-900/30 border-b border-red-900/50 px-4 py-2 max-h-32 overflow-y-auto">
          <p className="text-xs text-red-400 font-medium mb-1">Validation Errors:</p>
          {validationErrors.map((error, i) => (
            <p key={i} className="text-xs text-red-300">
              {error.path && <span className="text-red-400">{error.path}: </span>}
              {error.message}
            </p>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={getLanguage()}
          theme="vs-dark"
          value={getEditorContent()}
          onChange={activeTab === 'dsl' ? handleEditorChange : undefined}
          options={{
            readOnly: activeTab !== 'dsl',
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            wordWrap: 'on',
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}
