'use client';

import { Panel, Group, Separator } from 'react-resizable-panels';
import { PromptPanel } from './PromptPanel';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from './PreviewPanel';
import { useEditorStore } from '@/store';

export function EditorLayout() {
  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden">
      <Header />

      <Group
        id="kinetic-v4"
        orientation="horizontal"
        className="flex-1 w-full"
      >
        <Panel
          defaultSize={25}
          minSize={20}
          collapsible={false}
          className="relative"
        >
          <div className="h-full flex flex-col overflow-hidden border-r border-zinc-800">
            <PromptPanel />
          </div>
        </Panel>

        <Separator className="w-1.5 bg-zinc-800 hover:bg-violet-600 transition-colors cursor-col-resize flex-shrink-0" />

        <Panel
          defaultSize={40}
          minSize={30}
          collapsible={false}
          className="relative"
        >
          <div className="h-full flex flex-col overflow-hidden border-r border-zinc-800">
            <CodeEditor />
          </div>
        </Panel>

        <Separator className="w-1.5 bg-zinc-800 hover:bg-violet-600 transition-colors cursor-col-resize flex-shrink-0" />

        <Panel
          defaultSize={35}
          minSize={25}
          collapsible={false}
          className="relative"
        >
          <div className="h-full flex flex-col overflow-hidden">
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
          onClick={() => {
            localStorage.removeItem('react-resizable-panels:kinetic-v4');
            window.location.reload();
          }}
          className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset Layout"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
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
