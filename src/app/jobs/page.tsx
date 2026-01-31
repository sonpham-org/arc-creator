'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Calculate runtime for pending/running jobs
  const getRuntime = (createdAt: string) => {
    const elapsed = currentTime - new Date(createdAt).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Auto-refresh every 5 seconds
    const timeInterval = setInterval(() => setCurrentTime(Date.now()), 1000); // Update time every second
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [filter]);

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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: Clock },
      running: { bg: 'bg-blue-100 text-blue-800', text: 'Running', icon: Loader2 },
      completed: { bg: 'bg-green-100 text-green-800', text: 'Completed', icon: CheckCircle },
      failed: { bg: 'bg-red-100 text-red-800', text: 'Failed', icon: XCircle },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold mb-2">Puzzle Generation Jobs</h1>
        <p className="text-gray-600">Track bulk puzzle generation tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">{stats.running}</div>
          <div className="text-sm text-blue-600">Running</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">{stats.completed}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-800">{stats.failed}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'running', 'completed', 'failed'].map((f) => (
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

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-dashed rounded-xl p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            No jobs found
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Run the Python script to create bulk generation jobs
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(job.status)}
                    <span className="text-xs text-gray-500 font-mono">
                      {job.id}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {job.concept}
                  </p>

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

                {job.puzzles && job.puzzles.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {job.puzzles.map((puzzle: any) => (
                      <Link
                        key={puzzle.id}
                        href={`/puzzle/${puzzle.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Puzzle
                        <ExternalLink size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
