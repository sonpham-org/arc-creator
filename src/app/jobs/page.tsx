'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, BrainCircuit, Beaker, Hammer } from 'lucide-react';
import Link from 'next/link';

type Tab = 'generation' | 'solving';

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>('generation');
  const [jobs, setJobs] = useState<any[]>([]);
  const [solvingJobs, setSolvingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solvingLoading, setSolvingLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [solvingFilter, setSolvingFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const getRuntime = (createdAt: string) => {
    const elapsed = currentTime - new Date(createdAt).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Fetch generation jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const url = filter === 'all' ? '/api/jobs' : `/api/jobs?status=${filter}`;
        const resp = await fetch(url);
        const data = await resp.json();
        setJobs(data);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  // Fetch solving jobs
  useEffect(() => {
    const fetchSolvingJobs = async () => {
      try {
        const url = solvingFilter === 'all'
          ? '/api/evaluation-jobs'
          : `/api/evaluation-jobs?status=${solvingFilter}`;
        const resp = await fetch(url);
        const data = await resp.json();
        setSolvingJobs(data);
      } catch (err) {
        console.error('Failed to fetch solving jobs:', err);
      } finally {
        setSolvingLoading(false);
      }
    };
    fetchSolvingJobs();
    const interval = setInterval(fetchSolvingJobs, 5000);
    return () => clearInterval(interval);
  }, [solvingFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: Clock },
      queued: { bg: 'bg-yellow-100 text-yellow-800', text: 'Queued', icon: Clock },
      running: { bg: 'bg-blue-100 text-blue-800', text: 'Running', icon: Loader2 },
      completed: { bg: 'bg-green-100 text-green-800', text: 'Completed', icon: CheckCircle },
      failed: { bg: 'bg-red-100 text-red-800', text: 'Failed', icon: XCircle },
      cancelled: { bg: 'bg-gray-100 text-gray-500', text: 'Cancelled', icon: XCircle },
      skipped: { bg: 'bg-gray-100 text-gray-500', text: 'Skipped', icon: XCircle },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.bg}`}>
        <Icon size={14} className={status === 'running' ? 'animate-spin' : ''} />
        {badge.text}
      </span>
    );
  };

  const genStats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  const solveStats = {
    total: solvingJobs.length,
    queued: solvingJobs.filter(j => j.status === 'queued').length,
    running: solvingJobs.filter(j => j.status === 'running').length,
    completed: solvingJobs.filter(j => j.status === 'completed').length,
    failed: solvingJobs.filter(j => j.status === 'failed').length,
    skipped: solvingJobs.filter(j => j.status === 'skipped').length,
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          <button
            onClick={() => setTab('generation')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'generation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Hammer size={16} />
            Generation Jobs
            {genStats.running > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{genStats.running}</span>
            )}
          </button>
          <button
            onClick={() => setTab('solving')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'solving'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Beaker size={16} />
            Solving Jobs
            {solveStats.running > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{solveStats.running}</span>
            )}
          </button>
        </div>
      </div>

      {/* Generation Jobs Tab */}
      {tab === 'generation' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-900 border rounded-lg p-4">
              <div className="text-2xl font-bold">{genStats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-800">{genStats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-800">{genStats.running}</div>
              <div className="text-sm text-blue-600">Running</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-800">{genStats.completed}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-800">{genStats.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-800">{genStats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'pending', 'running', 'completed', 'failed', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-dashed rounded-xl p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No jobs found</p>
              <p className="text-gray-500 text-sm mt-2">Use the agent enqueue endpoint to create puzzle generation jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white dark:bg-gray-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(job.status)}
                        <span className="text-xs text-gray-500 font-mono">{job.id}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{job.concept}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                        {job.model && <span>Model: {job.model}</span>}
                        {(job.status === 'pending' || job.status === 'running') && (
                          <span className="font-semibold text-blue-600">Runtime: {getRuntime(job.createdAt)}</span>
                        )}
                        {job.tokensUsed && <span>Tokens: {job.tokensUsed.toLocaleString()}</span>}
                        {job.timeTakenMs && <span>Time: {(job.timeTakenMs / 1000).toFixed(1)}s</span>}
                      </div>
                      {job.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-xs text-red-700">
                          Error: {job.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Monitor Job
                        <BrainCircuit size={14} />
                      </Link>
                      {job.puzzles && job.puzzles.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {job.puzzles.map((puzzle: any) => (
                            <Link
                              key={puzzle.id}
                              href={`/puzzle/${puzzle.id}`}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                            >
                              View Result
                              <ExternalLink size={14} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Solving Jobs Tab */}
      {tab === 'solving' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-900 border rounded-lg p-4">
              <div className="text-2xl font-bold">{solveStats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-800">{solveStats.queued}</div>
              <div className="text-sm text-yellow-600">Queued</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-800">{solveStats.running}</div>
              <div className="text-sm text-blue-600">Running</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-800">{solveStats.completed}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-800">{solveStats.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-800">{solveStats.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'queued', 'running', 'completed', 'failed', 'skipped'].map((f) => (
              <button
                key={f}
                onClick={() => setSolvingFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  solvingFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {solvingLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
          ) : solvingJobs.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-dashed rounded-xl p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No solving jobs found</p>
              <p className="text-gray-500 text-sm mt-2">Use the admin evaluation panel to enqueue solving jobs</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Provider</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Model</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Priority</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Attempts</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Puzzle</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Updated</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solvingJobs.map((job) => (
                      <tr key={job.id} className="border-b last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3 font-medium">{job.provider}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{job.model}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            job.priority === 1 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            P{job.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{job.attempts}/{job.maxAttempts}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/puzzle/${job.puzzleId}`}
                            className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                          >
                            {job.puzzleId?.substring(0, 8)}...
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(job.updatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-red-600 text-xs max-w-[200px] truncate">
                          {job.lastError || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
