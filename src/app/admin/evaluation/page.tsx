'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Play, Zap, BarChart3, RefreshCw, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface QueueStatus {
  queue: Record<string, number>;
  providerBreakdown: { provider: string; model: string; status: string; count: number }[];
  totalEligibleGenerations: number;
  configuredProviders: string[];
  rateLimits: Record<string, { minuteTokens: number; dayTokens: number; backoffUntil: number }>;
}

interface ActionResult {
  message: string;
  [key: string]: any;
}

export default function EvaluationAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [maxToQueue, setMaxToQueue] = useState(200);
  const [autoProcess, setAutoProcess] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(['ARC-AGI 2024', 'ARC-AGI 2025']);

  const ALL_TAGS = ['ARC-AGI 2024', 'ARC-AGI 2025', 'ConceptARC', 'training', 'evaluation', 'Community', 'Mini-ARC', 'Synthetic Riddles'];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Load admin key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arc_admin_key');
    if (saved) {
      setAdminKey(saved);
      setIsAuthenticated(true);
    }
  }, []);

  const saveAdminKey = () => {
    localStorage.setItem('arc_admin_key', adminKey);
    setIsAuthenticated(true);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('arc_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setStatus(null);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/evaluation/status?adminKey=${encodeURIComponent(adminKey)}`);
      if (res.status === 401) {
        setError('Invalid admin key');
        setIsAuthenticated(false);
        localStorage.removeItem('arc_admin_key');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [adminKey]);

  // Fetch status on auth
  useEffect(() => {
    if (isAuthenticated) fetchStatus();
  }, [isAuthenticated, fetchStatus]);

  // Auto-refresh status every 10s
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchStatus]);

  const callApi = async (endpoint: string, body: Record<string, any>) => {
    setLoading(endpoint);
    setLastResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/evaluation/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastResult(data);
      fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  // Auto-process loop
  useEffect(() => {
    if (!autoProcess || !isAuthenticated) return;
    const interval = setInterval(() => {
      callApi('process', { batchSize });
    }, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoProcess, isAuthenticated, batchSize]);

  // Login gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold">Admin Evaluation Panel</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Enter your admin key to access evaluation controls.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded text-sm">
              {error}
            </div>
          )}
          <input
            type="password"
            placeholder="Admin Key"
            className="w-full border rounded px-3 py-2 mb-4 text-sm"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveAdminKey()}
          />
          <button
            onClick={saveAdminKey}
            className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  const queuedCount = status?.queue?.queued ?? 0;
  const runningCount = status?.queue?.running ?? 0;
  const completedCount = status?.queue?.completed ?? 0;
  const failedCount = status?.queue?.failed ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold">Evaluation Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStatus} className="text-gray-500 hover:text-gray-700">
              <RefreshCw size={16} />
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">
              Logout
            </button>
          </div>
        </div>

        {/* Error / Result banners */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded text-sm flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}
        {lastResult && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 rounded text-sm">
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(lastResult, null, 2)}</pre>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Clock size={18} />} label="Queued" value={queuedCount} color="text-yellow-600" />
          <StatCard icon={<Loader2 size={18} className={runningCount > 0 ? 'animate-spin' : ''} />} label="Running" value={runningCount} color="text-blue-600" />
          <StatCard icon={<CheckCircle size={18} />} label="Completed" value={completedCount} color="text-green-600" />
          <StatCard icon={<XCircle size={18} />} label="Failed" value={failedCount} color="text-red-600" />
        </div>

        {/* Configured providers */}
        {status && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold mb-2">Configured Providers</h2>
            <div className="flex flex-wrap gap-2">
              {status.configuredProviders.map(p => (
                <span key={p} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 text-xs rounded font-medium">
                  {p}
                </span>
              ))}
              {['gemini', 'groq', 'mistral', 'cerebras', 'openrouter'].filter(p => !status.configuredProviders.includes(p)).map(p => (
                <span key={p} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs rounded font-medium line-through">
                  {p}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {status.totalEligibleGenerations} generations with test cases available for evaluation
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Smart Enqueue */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" /> Smart Enqueue
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Prioritizes ARC-AGI 2024/2025 first. Cheap models first pass, expensive only where cheap failed.
            </p>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1.5">Target datasets:</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 border-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-2 py-0.5 rounded text-[11px] font-medium text-gray-400 hover:text-gray-600 underline"
                >
                  {selectedTags.length === 0 ? 'All selected' : 'Select all'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-gray-500">Max to queue:</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-xs w-24"
                value={maxToQueue}
                onChange={(e) => setMaxToQueue(Number(e.target.value))}
              />
            </div>
            <button
              onClick={() => callApi('smart-enqueue', {
                maxToQueue,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
              })}
              disabled={loading !== null}
              className="w-full bg-yellow-500 text-white rounded py-2 text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'smart-enqueue' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Smart Enqueue{selectedTags.length > 0 ? ` (${selectedTags.join(', ')})` : ' (All)'}
            </button>
          </div>

          {/* Process Batch */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Play size={16} className="text-green-500" /> Process Batch
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Processes queued jobs respecting rate limits. Run repeatedly to drain the queue.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-gray-500">Batch size:</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-xs w-24"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
              />
              <label className="text-xs text-gray-500 ml-2 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={autoProcess}
                  onChange={(e) => setAutoProcess(e.target.checked)}
                />
                Auto (every 15s)
              </label>
            </div>
            <button
              onClick={() => callApi('process', { batchSize })}
              disabled={loading !== null}
              className="w-full bg-green-600 text-white rounded py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'process' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {autoProcess ? 'Auto-Processing...' : 'Process Batch'}
            </button>
          </div>
        </div>

        {/* Provider breakdown table */}
        {status && status.providerBreakdown.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 size={16} /> Provider Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {status.providerBreakdown.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-1.5 pr-4 font-medium">{row.provider}</td>
                      <td className="py-1.5 pr-4 font-mono text-gray-500">{row.model}</td>
                      <td className="py-1.5 pr-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-1.5">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rate limits */}
        {status && Object.keys(status.rateLimits).length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" /> Rate Limit Status
            </h2>
            <div className="space-y-2">
              {Object.entries(status.rateLimits).map(([key, rl]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-600">{key}</span>
                  <div className="flex items-center gap-4">
                    <span>RPM: {rl.minuteTokens}</span>
                    <span>RPD: {rl.dayTokens}</span>
                    {rl.backoffUntil > Date.now() && (
                      <span className="text-red-500">Backing off</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}
