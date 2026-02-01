'use client';

import React, { useEffect, useState, use } from 'react';
import { useSettings } from '@/context/SettingsContext';
import PuzzlePair from '@/components/PuzzlePair';
import PuzzleReviewTab from '@/components/PuzzleReviewTab';
import ModelPerformancesTab from '@/components/ModelPerformancesTab';
import { ARC_COLORS } from '@/components/ArcGrid';
import { Loader2, Send, History as HistoryIcon, MessageSquare, BrainCircuit, Eye, BarChart3 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'review' | 'performance' | 'reasoning'>('review');
  const [editMode, setEditMode] = useState(false);
  const [ratings, setRatings] = useState<any>(null);
  const [userRating, setUserRating] = useState({ quality: 0, difficulty: 0, interestingness: 0 });

  const provider = detectProvider(apiKey);
  const availableModels = PROVIDER_MODELS[provider];

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  useEffect(() => {
    fetchPuzzle();
    fetchRatings();
  }, [id]);

  const fetchRatings = async () => {
    try {
      const resp = await fetch(`/api/puzzles/${id}/ratings`);
      const data = await resp.json();
      setRatings(data);
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    }
  };

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
        setEditMode(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!userRating.quality || !userRating.difficulty || !userRating.interestingness) {
      alert('Please rate all three aspects');
      return;
    }
    
    try {
      await fetch(`/api/puzzles/${id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userRating),
      });
      fetchRatings();
      setUserRating({ quality: 0, difficulty: 0, interestingness: 0 });
    } catch (err) {
      console.error('Failed to submit rating:', err);
      alert('Failed to submit rating');
    }
  };

  const renderStars = (value: number, onChange?: (v: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={`text-2xl ${star <= value ? 'text-yellow-400' : 'text-gray-300'} ${onChange ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  if (!puzzle) return <div className="text-center pt-20 text-red-500">Puzzle not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono">{puzzle.id}</h1>
            {puzzle.idea && puzzle.idea !== puzzle.id && (
              <p className="text-sm text-gray-500 mt-1">{puzzle.idea}</p>
            )}
            {puzzle.source && puzzle.idea === puzzle.id && (
              <p className="text-sm text-gray-500 mt-1">{puzzle.source}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {puzzle.tags?.map((tag: string) => (
              <span key={tag} className="text-xs font-semibold bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-700 dark:text-blue-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'review'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye size={18} />
          Puzzle Review
        </button>
        {currentGen?.reasoning && !puzzle.tags?.includes('arc-2024') && !puzzle.tags?.includes('arc-2025') && (
          <button
            onClick={() => setActiveTab('reasoning')}
            className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'reasoning'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BrainCircuit size={18} />
            Agent Reasoning
          </button>
        )}
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'performance'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 size={18} />
          Model Performances
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tab Content */}
        <div className="lg:col-span-2">
          {activeTab === 'review' ? (
            currentGen && editedPairs.length > 0 ? (
              <PuzzleReviewTab
                currentGen={currentGen}
                editedPairs={editedPairs}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                editMode={editMode}
                onEditInput={(pairIndex, r, c) => handleCellClick(pairIndex, 'input', r, c)}
                onEditOutput={(pairIndex, r, c) => handleCellClick(pairIndex, 'output', r, c)}
                onResizeInput={(pairIndex, rows, cols) => resizeGrid(pairIndex, 'input', rows, cols)}
                onResizeOutput={(pairIndex, rows, cols) => resizeGrid(pairIndex, 'output', rows, cols)}
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            )
          ) : activeTab === 'reasoning' ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="text-blue-600" size={22} />
                <h2 className="text-xl font-semibold">Agent Reasoning</h2>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic leading-relaxed">
                {currentGen?.reasoning || 'No reasoning available for this puzzle.'}
              </div>
            </div>
          ) : (
            <ModelPerformancesTab generationId={currentGen?.id} />
          )}
        </div>

        {/* Right: Ratings & Feedback */}
        <div className="space-y-6">
          
          {/* Rating Section */}
          <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Rate this Puzzle</h2>
            
            {ratings && ratings.count > 0 && (
              <div className="mb-6 pb-6 border-b">
                <div className="text-sm text-gray-500 mb-3">{ratings.count} rating{ratings.count > 1 ? 's' : ''}</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quality</span>
                    {renderStars(Math.round(ratings.averages.quality))}
                    <span className="text-sm text-gray-500">{ratings.averages.quality.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Difficulty</span>
                    {renderStars(Math.round(ratings.averages.difficulty))}
                    <span className="text-sm text-gray-500">{ratings.averages.difficulty.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Interestingness</span>
                    {renderStars(Math.round(ratings.averages.interestingness))}
                    <span className="text-sm text-gray-500">{ratings.averages.interestingness.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-2">Quality</label>
                {renderStars(userRating.quality, (v) => setUserRating({ ...userRating, quality: v }))}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Difficulty</label>
                {renderStars(userRating.difficulty, (v) => setUserRating({ ...userRating, difficulty: v }))}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Interestingness</label>
                {renderStars(userRating.interestingness, (v) => setUserRating({ ...userRating, interestingness: v }))}
              </div>
              <button
                onClick={handleSubmitRating}
                disabled={!userRating.quality || !userRating.difficulty || !userRating.interestingness}
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-all text-sm"
              >
                Submit Rating
              </button>
            </div>
          </div>

          {/* Improve Puzzle Button */}
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
            >
              ✏️ Improve this Puzzle
            </button>
          )}

          {/* Feedback Section - Only in Edit Mode */}
          {editMode && (
            <div className="bg-white dark:bg-gray-900 border-2 border-red-500 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-red-600" size={20} />
                  <h2 className="text-xl font-semibold">Give Feedback</h2>
                </div>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedPairs(JSON.parse(JSON.stringify(currentGen.pairs)));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Color Palette */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase">Color Palette</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ARC_COLORS).map(([num, colorClass]) => {
                    const colorMap: Record<number, string> = {
                      0: '#000000',
                      1: '#0074D9',
                      2: '#FF4136',
                      3: '#2ECC40',
                      4: '#FFDC00',
                      5: '#AAAAAA',
                      6: '#F012BE',
                      7: '#FF851B',
                      8: '#7FDBFF',
                      9: '#870C25',
                    };
                    return (
                      <button
                        key={num}
                        onClick={() => setSelectedColor(Number(num))}
                        className={`w-10 h-10 rounded border-2 transition-all ${selectedColor === Number(num) ? 'border-blue-600 scale-110 shadow-lg' : 'border-gray-300'}`}
                        style={{ backgroundColor: colorMap[Number(num)] }}
                        title={`Color ${num}`}
                      />
                    );
                  })}
                </div>
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
                className="w-full h-32 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-red-500 outline-none mb-4"
                placeholder="What should be improved? The logic is wrong, the colors are off..."
                value={verbalFeedback}
                onChange={(e) => setVerbalFeedback(e.target.value)}
              />
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || (!verbalFeedback.trim() && JSON.stringify(currentGen?.pairs) === JSON.stringify(editedPairs))}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={18} /> Iterating...</>
                ) : (
                  <><Send size={18} /> Submit Feedback</>
                )}
              </button>
            </div>
          )}

          {/* History Section */}
          <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HistoryIcon className="text-gray-500" size={20} />
              <h2 className="text-xl font-semibold">Version History</h2>
            </div>
            <div className="space-y-2">
              {puzzle.generations?.map((gen: any, idx: number) => (
                <button
                  key={gen.id}
                  onClick={() => {
                    setCurrentGen(gen);
                    setEditedPairs(JSON.parse(JSON.stringify(gen.pairs)));
                  }}
                  className={`w-full text-left p-3 rounded text-sm transition-colors ${currentGen?.id === gen.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'hover:bg-gray-100 border-transparent'} border`}
                >
                  <div className="font-semibold">Version {idx + 1}</div>
                  <div className="text-xs text-gray-500">{new Date(gen.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
