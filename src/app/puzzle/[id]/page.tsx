'use client';

import React, { useEffect, useState, use } from 'react';
import { useSettings } from '@/context/SettingsContext';
import PuzzlePair from '@/components/PuzzlePair';
import { ARC_COLORS } from '@/components/ArcGrid';
import { Loader2, Send, History as HistoryIcon, MessageSquare, BrainCircuit } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { detectProvider, PROVIDER_MODELS } from '@/lib/llm';

export default function PuzzleDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialModel = searchParams.get('model') || '';
  const { apiKey } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [currentGen, setCurrentGen] = useState<any>(null);
  const [editedPairs, setEditedPairs] = useState<any[]>([]);
  const [verbalFeedback, setVerbalFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(1);
  const [selectedModel, setSelectedModel] = useState(initialModel);

  const provider = detectProvider(apiKey);
  const availableModels = PROVIDER_MODELS[provider];

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  useEffect(() => {
    fetchPuzzle();
  }, [id]);

  const fetchPuzzle = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/puzzles/${id}`);
      const data = await resp.json();
      setPuzzle(data);
      if (data.generations && data.generations.length > 0) {
        // Find the latest in the current branch? 
        // For simplicity, just get the latest generation for now.
        const latest = data.generations[data.generations.length - 1];
        setCurrentGen(latest);
        setEditedPairs(JSON.parse(JSON.stringify(latest.pairs))); // deep clone
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (pairIndex: number, type: 'input' | 'output', r: number, c: number) => {
    const newPairs = [...editedPairs];
    const grid = JSON.parse(JSON.stringify(newPairs[pairIndex][type]));
    grid[r][c] = selectedColor;
    newPairs[pairIndex][type] = grid;
    setEditedPairs(newPairs);
  };

  const resizeGrid = (pairIndex: number, type: 'input' | 'output', rows: number, cols: number) => {
    const newPairs = [...editedPairs];
    const oldGrid = newPairs[pairIndex][type] as number[][];
    const newGrid = Array(rows).fill(0).map((_, r) => 
      Array(cols).fill(0).map((_, c) => (oldGrid[r]?.[c] ?? 0))
    );
    newPairs[pairIndex][type] = newGrid;
    setEditedPairs(newPairs);
  };

  const handleSubmitFeedback = async () => {
    if (!apiKey) {
      alert('Please enter your API key');
      return;
    }
    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/puzzles/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: currentGen.id,
          verbalFeedback,
          gridEdits: editedPairs,
          apiKey,
          model: selectedModel
        }),
      });
      const data = await resp.json();
      if (data.newGenerationId) {
        // Refresh or update state
        fetchPuzzle();
        setVerbalFeedback('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  if (!puzzle) return <div className="text-center pt-20 text-red-500">Puzzle not found.</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{puzzle.idea}</h1>
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500 uppercase tracking-wider">
            ID: {id}
          </span>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span>Tokens: {currentGen?.tokensUsed}</span>
          <span>Time: {(currentGen?.timeTakenMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Puzzle Pairs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-xl font-semibold">Challenge Pairs (5)</h2>
            <div className="flex gap-1">
              {Object.keys(ARC_COLORS).map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded border ${selectedColor === Number(c) ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${ARC_COLORS[Number(c)]}`}
                  onClick={() => setSelectedColor(Number(c))}
                />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {editedPairs.map((pair, idx) => (
              <PuzzlePair 
                key={pair.id || idx}
                input={pair.input}
                output={pair.output}
                onEditInput={(r, c) => handleCellClick(idx, 'input', r, c)}
                onEditOutput={(r, c) => handleCellClick(idx, 'output', r, c)}
                onResizeInput={(rows, cols) => resizeGrid(idx, 'input', rows, cols)}
                onResizeOutput={(rows, cols) => resizeGrid(idx, 'output', rows, cols)}
                editable
              />
            ))}
          </div>
        </div>

        {/* Right: Feedback & History */}
        <div className="space-y-6">
          {/* Agent Reasoning Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="text-blue-600" size={20} />
              <h2 className="text-xl font-semibold">Agent Reasoning</h2>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic">
              {currentGen?.reasoning || "No reasoning trace available for this version."}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 shadow-sm sticky top-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="text-blue-600" size={20} />
              <h2 className="text-xl font-semibold">Give Feedback</h2>
            </div>

            {availableModels.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Agent Model</label>
                <select
                  className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isSubmitting}
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              className="w-full h-32 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              placeholder="What should be improved? The logic is wrong, the colors are off..."
              value={verbalFeedback}
              onChange={(e) => setVerbalFeedback(e.target.value)}
            />
            <button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting || (!verbalFeedback.trim() && JSON.stringify(currentGen?.pairs) === JSON.stringify(editedPairs))}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={18} /> Iterating...</>
              ) : (
                <><Send size={18} /> Submit Feedback</>
              )}
            </button>

            <div className="mt-8 pt-8 border-t">
              <div className="flex items-center gap-2 mb-4">
                <HistoryIcon className="text-gray-500" size={20} />
                <h2 className="text-xl font-semibold">Branch History</h2>
              </div>
              <div className="space-y-3">
                {puzzle.generations?.map((gen: any, idx: number) => (
                  <button
                    key={gen.id}
                    onClick={() => {
                      setCurrentGen(gen);
                      setEditedPairs(JSON.parse(JSON.stringify(gen.pairs)));
                    }}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${currentGen?.id === gen.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'hover:bg-gray-100 border-transparent'} border`}
                  >
                    Version {idx + 1} - {new Date(gen.createdAt).toLocaleTimeString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
