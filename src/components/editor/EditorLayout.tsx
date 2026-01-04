'use client';

import { Panel, Group, Separator } from 'react-resizable-panels';
import { PromptPanel } from './PromptPanel';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from './PreviewPanel';
import { useEditorStore } from '@/store';

export function EditorLayout() {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <Group orientation="horizontal" className="flex-1 overflow-hidden">
        {/* Left: Prompt/Chat Panel */}
        <Panel defaultSize={28} minSize={20} maxSize={40}>
          <div className="h-full w-full overflow-hidden">
            <PromptPanel />
          </div>
        </Panel>

        <Separator className="w-2 bg-zinc-800 hover:bg-violet-600 transition-colors cursor-col-resize flex-shrink-0" />

        {/* Center: Code Editor */}
        <Panel defaultSize={36} minSize={25}>
          <div className="h-full w-full overflow-hidden">
            <CodeEditor />
          </div>
        </Panel>

        <Separator className="w-2 bg-zinc-800 hover:bg-violet-600 transition-colors cursor-col-resize flex-shrink-0" />

        {/* Right: Preview */}
        <Panel defaultSize={36} minSize={25}>
          <div className="h-full w-full overflow-hidden">
            <PreviewPanel />
          </div>
        </Panel>
      </Group>
    </div>
  );
}

function Header() {
  const { projectName, hasUnsavedChanges, saveProject, newProject } = useEditorStore();

  return (
    <header className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Kinetic
          </span>
        </div>

        {/* Project Name */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-300">{projectName}</span>
          {hasUnsavedChanges && (
            <span className="text-zinc-500 text-xs">(unsaved)</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={newProject}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          New
        </button>
        <button
          onClick={saveProject}
          className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          Save
        </button>
        <button className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 rounded-md transition-colors">
          Export
        </button>
      </div>
    </header>
  );
}
