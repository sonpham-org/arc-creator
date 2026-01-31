'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { Loader2, Send, Lock } from 'lucide-react';
import { detectProvider, PROVIDER_MODELS } from '@/lib/llm';

export default function NewPuzzlePage() {
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const { apiKey: settingsApiKey } = useSettings();
  const router = useRouter();

  // Use local API key if provided, otherwise fall back to settings
  const activeApiKey = localApiKey || settingsApiKey;
  const provider = detectProvider(activeApiKey);
  const availableModels = PROVIDER_MODELS[provider];

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || !activeApiKey) return;

    setIsGenerating(true);
    try {
      const resp = await fetch('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, apiKey: activeApiKey, model: selectedModel }),
      });
      const data = await resp.json();
      if (data.id) {
        router.push(`/puzzle/${data.id}?model=${selectedModel}`);
      } else if (data.error) {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start puzzle generation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pt-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Create a New ARC Puzzle</h1>
        <p className="text-gray-500">
          Enter an idea, concept, or phenomenon, and let the agent design a logic challenge for you.
        </p>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Logic Concept</label>
          <textarea
            className="w-full h-32 p-4 border rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Gravity, Mirror Reflection, Cellular Automaton..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">LLM API Key</label>
          <input
            type="password"
            className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            placeholder="sk-... or sk-ant-... or AIza... or gsk_..."
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            disabled={isGenerating}
          />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock size={12} />
            <span>Your API key is never stored. Used only for this session.</span>
          </div>
          {provider !== 'unknown' && (
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Detected: {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </div>
          )}
        </div>

        {availableModels.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agent Model</label>
            <select
              className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isGenerating}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
        
        {!activeApiKey && (
          <p className="text-sm text-red-500 font-medium">
            Please enter your API key above to start.
          </p>
        )}

        <button
          type="submit"
          disabled={isGenerating || !idea.trim() || !activeApiKey}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <><Loader2 className="animate-spin" /> Generating Puzzle...</>
          ) : (
            <><Send size={20} /> Launch Agent</>
          )}
        </button>
      </form>
    </div>
  );
}
