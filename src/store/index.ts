/**
 * Kinetic State Management
 * Using Zustand for global state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KineticAnimation } from '@/dsl/schema';
import { createEmptyDSL } from '@/dsl/parser';
import { validateDSLString } from '@/dsl/validator';

// ============================================================
// TYPES
// ============================================================

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  dsl?: KineticAnimation;
  error?: string;
};

export type SavedProject = {
  id: string;
  name: string;
  dsl: KineticAnimation;
  createdAt: number;
  updatedAt: number;
};

export type ValidationError = {
  path: string;
  message: string;
};

export type EditorTab = 'dsl' | 'framer' | 'css' | 'gsap';

export type PreviewState = 'idle' | 'playing' | 'paused';

// ============================================================
// STORE INTERFACE
// ============================================================

interface EditorState {
  // DSL State
  dsl: KineticAnimation;
  dslJson: string;
  validationErrors: ValidationError[];

  // UI State
  activeTab: EditorTab;
  sidebarCollapsed: boolean;
  previewState: PreviewState;

  // Chat State
  messages: ChatMessage[];
  isGenerating: boolean;

  // Project State
  projectName: string;
  savedProjects: SavedProject[];
  hasUnsavedChanges: boolean;

  // Settings
  apiKey: string;
  selectedModel: string;

  // Actions - DSL
  setDsl: (dsl: KineticAnimation) => void;
  setDslJson: (json: string) => void;
  updateDslFromJson: () => boolean;

  // Actions - UI
  setActiveTab: (tab: EditorTab) => void;
  toggleSidebar: () => void;
  setPreviewState: (state: PreviewState) => void;

  // Actions - Chat
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setIsGenerating: (generating: boolean) => void;

  // Actions - Project
  setProjectName: (name: string) => void;
  saveProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  newProject: () => void;

  // Actions - Settings
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;

  // Actions - Validation
  setValidationErrors: (errors: ValidationError[]) => void;
}

// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULT_DSL = createEmptyDSL();
DEFAULT_DSL.meta = { name: 'Untitled Animation' };

const EXAMPLE_DSL: KineticAnimation = {
  version: '1.0',
  meta: { name: 'Button Hover Example' },
  elements: {
    button: {
      type: 'box',
      initial: {
        scale: 1,
        backgroundColor: '#6366f1',
        borderRadius: 12,
        width: 160,
        height: 48,
        opacity: 1,
      },
    },
  },
  timeline: {
    sequences: [
      {
        id: 'hover',
        trigger: { type: 'hover' },
        animations: [
          {
            type: 'spring',
            target: 'button',
            to: { scale: 1.05 },
            spring: { stiffness: 400, damping: 25 },
          },
        ],
      },
      {
        id: 'hoverEnd',
        trigger: { type: 'hoverEnd' },
        animations: [
          {
            type: 'spring',
            target: 'button',
            to: { scale: 1 },
            spring: { stiffness: 400, damping: 25 },
          },
        ],
      },
    ],
  },
};

// ============================================================
// STORE
// ============================================================

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial State
      dsl: EXAMPLE_DSL,
      dslJson: JSON.stringify(EXAMPLE_DSL, null, 2),
      validationErrors: [],
      activeTab: 'dsl',
      sidebarCollapsed: false,
      previewState: 'idle',
      messages: [],
      isGenerating: false,
      projectName: 'Untitled',
      savedProjects: [],
      hasUnsavedChanges: false,
      apiKey: '',
      selectedModel: 'google/gemini-2.0-flash-exp:free',

      // DSL Actions
      setDsl: (dsl) => {
        set({
          dsl,
          dslJson: JSON.stringify(dsl, null, 2),
          validationErrors: [],
          hasUnsavedChanges: true,
          projectName: dsl.meta?.name || 'Untitled',
        });
      },

      setDslJson: (json) => {
        set({ dslJson: json, hasUnsavedChanges: true });
      },

      updateDslFromJson: () => {
        const { dslJson } = get();
        const result = validateDSLString(dslJson);

        if (result.valid) {
          set({
            dsl: result.data,
            validationErrors: [],
            projectName: result.data.meta?.name || 'Untitled',
          });
          return true;
        } else {
          set({
            validationErrors: result.errors.map((e) => ({
              path: e.path,
              message: e.message,
            })),
          });
          return false;
        }
      },

      // UI Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPreviewState: (state) => set({ previewState: state }),

      // Chat Actions
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, newMessage] }));
      },

      clearMessages: () => set({ messages: [] }),
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      // Project Actions
      setProjectName: (name) => set({ projectName: name, hasUnsavedChanges: true }),

      saveProject: () => {
        const { dsl, projectName, savedProjects } = get();
        const existingIndex = savedProjects.findIndex(
          (p) => p.name === projectName
        );

        const project: SavedProject = {
          id: existingIndex >= 0 ? savedProjects[existingIndex].id : crypto.randomUUID(),
          name: projectName,
          dsl,
          createdAt:
            existingIndex >= 0 ? savedProjects[existingIndex].createdAt : Date.now(),
          updatedAt: Date.now(),
        };

        if (existingIndex >= 0) {
          const updated = [...savedProjects];
          updated[existingIndex] = project;
          set({ savedProjects: updated, hasUnsavedChanges: false });
        } else {
          set({
            savedProjects: [...savedProjects, project],
            hasUnsavedChanges: false,
          });
        }
      },

      loadProject: (id) => {
        const project = get().savedProjects.find((p) => p.id === id);
        if (project) {
          set({
            dsl: project.dsl,
            dslJson: JSON.stringify(project.dsl, null, 2),
            projectName: project.name,
            validationErrors: [],
            hasUnsavedChanges: false,
          });
        }
      },

      deleteProject: (id) => {
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
        }));
      },

      newProject: () => {
        const newDsl = createEmptyDSL();
        newDsl.meta = { name: 'Untitled Animation' };
        set({
          dsl: newDsl,
          dslJson: JSON.stringify(newDsl, null, 2),
          projectName: 'Untitled',
          validationErrors: [],
          hasUnsavedChanges: false,
          messages: [],
        });
      },

      // Settings Actions
      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),

      // Validation Actions
      setValidationErrors: (errors) => set({ validationErrors: errors }),
    }),
    {
      name: 'kinetic-editor-storage',
      partialize: (state) => ({
        savedProjects: state.savedProjects,
        apiKey: state.apiKey,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
