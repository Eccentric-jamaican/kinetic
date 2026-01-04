'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store';

export function PromptPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isGenerating,
    dsl,
    addMessage,
    setIsGenerating,
    setDsl,
  } = useEditorStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setIsGenerating(true);

    try {
      // If we have existing DSL, use refinement
      const hasExistingAnimation =
        dsl.elements && Object.keys(dsl.elements).length > 0;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          hasExistingAnimation
            ? { type: 'refine', prompt: userMessage, currentDsl: dsl }
            : { type: 'generate', prompt: userMessage }
        ),
      });

      const result = await response.json();

      if (result.success) {
        setDsl(result.dsl);
        addMessage({
          role: 'assistant',
          content: 'Animation generated successfully!',
          dsl: result.dsl,
        });
      } else {
        addMessage({
          role: 'assistant',
          content: `Error: ${result.error}`,
          error: result.error,
        });
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: String(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <span className="text-sm font-medium text-zinc-300">Prompt</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-sm mb-4">Describe the animation you want to create</p>
            <div className="space-y-2 text-xs text-left max-w-xs mx-auto">
              <p className="text-zinc-400 font-medium">Examples:</p>
              <button
                onClick={() => setInput('A button that scales up with a bounce on hover')}
                className="block w-full text-left px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                "A button that scales up with a bounce on hover"
              </button>
              <button
                onClick={() => setInput('Cards that fade in one by one from the bottom')}
                className="block w-full text-left px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                "Cards that fade in one by one from the bottom"
              </button>
              <button
                onClick={() => setInput('A loading spinner with rotating segments')}
                className="block w-full text-left px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                "A loading spinner with rotating segments"
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : message.role === 'system'
                    ? 'bg-amber-900/50 text-amber-200'
                    : message.error
                      ? 'bg-red-900/50 text-red-200'
                      : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your animation..."
            disabled={isGenerating}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {isGenerating ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
