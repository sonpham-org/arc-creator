'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Loader2, Play, Trophy, Clock, Zap, ChevronRight, Brain } from 'lucide-react';
import ArcGrid from './ArcGrid';

interface ModelPerformancesTabProps {
  generationId: string;
}

export default function ModelPerformancesTab({ generationId }: ModelPerformancesTabProps) {
  const { apiKey } = useSettings();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [showNewRunForm, setShowNewRunForm] = useState(false);
  const [formData, setFormData] = useState({
    modelName: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4000,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const predContainerRef = useRef<HTMLDivElement>(null);
  const [predContainerWidth, setPredContainerWidth] = useState(0);

  useEffect(() => {
    if (!predContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPredContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(predContainerRef.current);
    return () => observer.disconnect();
  }, [selectedRun]);

  // Compute uniform cell size for prediction grids (3 grids side by side)
  const predCellSize = useMemo(() => {
    if (!predContainerWidth || !selectedRun?.predictions?.length) return 32;
    // 3 columns with gap-4 (16px each gap = 32px) + p-4 padding (32px) + p-6 outer (48px) + borders (16px)
    const overhead = 128;
    const availableWidth = predContainerWidth - overhead;

    let maxCols = 1;
    for (const pred of selectedRun.predictions) {
      const inputCols = pred.pair?.input?.[0]?.length || 1;
      const predictedCols = pred.predicted?.[0]?.length || 1;
      const expectedCols = pred.expected?.[0]?.length || 1;
      const totalCols = inputCols + predictedCols + expectedCols;
      if (totalCols > maxCols) maxCols = totalCols;
    }

    const computed = Math.floor(availableWidth / maxCols);
    return Math.max(4, Math.min(48, computed));
  }, [predContainerWidth, selectedRun]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [generationId]);

  const fetchRuns = async () => {
    try {
      const resp = await fetch(`/api/generations/${generationId}/runs`);
      const data = await resp.json();
      setRuns(data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAndExecuteRun = async () => {
    if (!formData.apiKey) {
      alert('Please enter an API key');
      return;
    }

    setIsCreating(true);
    try {
      // Create the run
      const createResp = await fetch(`/api/generations/${generationId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newRun = await createResp.json();

      // Execute the run
      setIsExecuting(true);
      await fetch(`/api/runs/${newRun.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: formData.apiKey }),
      });

      // Reset form
      setShowNewRunForm(false);
      setFormData({ ...formData, apiKey: '' });
      fetchRuns();
    } catch (err) {
      console.error('Failed to create/execute run:', err);
      alert('Failed to create run');
    } finally {
      setIsCreating(false);
      setIsExecuting(false);
    }
  };

  const viewRunDetails = async (runId: string) => {
    try {
      const resp = await fetch(`/api/runs/${runId}`);
      const data = await resp.json();
      setSelectedRun(data);
    } catch (err) {
      console.error('Failed to fetch run details:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (selectedRun) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedRun(null)}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          ← Back to runs
        </button>

        <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{selectedRun.modelName}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-xs text-blue-600 font-semibold uppercase mb-1">Accuracy</div>
              <div className="text-2xl font-bold">
                {selectedRun.accuracy !== null ? `${(selectedRun.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-xs text-green-600 font-semibold uppercase mb-1">Correct</div>
              <div className="text-2xl font-bold">
                {selectedRun.correctCount}/{selectedRun.totalCount}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-xs text-purple-600 font-semibold uppercase mb-1">Tokens</div>
              <div className="text-2xl font-bold">{selectedRun.tokensUsed?.toLocaleString() || 'N/A'}</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-xs text-orange-600 font-semibold uppercase mb-1">Time</div>
              <div className="text-2xl font-bold">
                {selectedRun.timeTakenMs ? `${(selectedRun.timeTakenMs / 1000).toFixed(1)}s` : 'N/A'}
              </div>
            </div>
          </div>

          {selectedRun.reasoning && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold">Model Reasoning</h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedRun.reasoning}
              </div>
            </div>
          )}

          <h3 className="text-xl font-bold mb-4">Predictions</h3>
          <div ref={predContainerRef} className="space-y-6">
            {selectedRun.predictions?.map((pred: any, idx: number) => (
              <div key={pred.id} className={`border-2 rounded-lg p-4 ${
                pred.isCorrect 
                  ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' 
                  : 'border-red-300 bg-red-50/50 dark:bg-red-900/10'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Test Case {idx + 1}</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    pred.isCorrect 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-red-200 text-red-800'
                  }`}>
                    {pred.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Input</div>
                    <ArcGrid grid={pred.pair.input} editable={false} cellSize={predCellSize} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Predicted Output</div>
                    <ArcGrid grid={pred.predicted} editable={false} cellSize={predCellSize} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Expected Output</div>
                    <ArcGrid grid={pred.expected} editable={false} cellSize={predCellSize} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Model Performance Runs</h2>
        <button
          onClick={() => setShowNewRunForm(!showNewRunForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
        >
          <Play size={18} />
          New Run
        </button>
      </div>

      {showNewRunForm && (
        <div className="bg-white dark:bg-gray-900 border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Configure New Run</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Provider</label>
              <select
                className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Model</label>
              <input
                type="text"
                className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
                value={formData.modelName}
                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                placeholder="e.g., claude-3-5-sonnet-20241022"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">API Key</label>
              <input
                type="password"
                className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Max Tokens</label>
                <input
                  type="number"
                  step="100"
                  className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <button
              onClick={createAndExecuteRun}
              disabled={isCreating || isExecuting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isCreating || isExecuting ? (
                <><Loader2 className="animate-spin" size={18} /> Creating...</>
              ) : (
                <><Play size={18} /> Create & Execute</>
              )}
            </button>
          </div>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-dashed rounded-xl p-12 text-center">
          <Trophy className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            No model runs yet
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Click "New Run" to evaluate a model on this puzzle
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => viewRunDetails(run.id)}
              className="w-full bg-white dark:bg-gray-900 border hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 shadow-sm transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{run.modelName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      run.status === 'completed' ? 'bg-green-100 text-green-800' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      run.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Trophy size={14} />
                      <span>
                        {run.accuracy !== null ? `${(run.accuracy * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={14} />
                      <span>{run.tokensUsed?.toLocaleString() || 'N/A'} tokens</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>

              {run.status === 'running' && (
                <div className="mt-3">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
