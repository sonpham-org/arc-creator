'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { Loader2, Send } from 'lucide-react';
import { detectProvider, PROVIDER_MODELS } from '@/lib/llm';

export default function NewPuzzlePage() {
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const { apiKey } = useSettings();
  const router = useRouter();

  const provider = detectProvider(apiKey);
  const availableModels = PROVIDER_MODELS[provider];

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || !apiKey) return;

    setIsGenerating(true);
    try {
      const resp = await fetch('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, apiKey, model: selectedModel }),
      });
      const data = await resp.json();
      if (data.id) {
        router.push(`/puzzle/${data.id}?model=${selectedModel}`);
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
        
        {!apiKey && (
          <p className="text-sm text-red-500 font-medium">
            Please enter your API key in the navbar to start.
          </p>
        )}

        <button
          type="submit"
          disabled={isGenerating || !idea.trim() || !apiKey}
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
