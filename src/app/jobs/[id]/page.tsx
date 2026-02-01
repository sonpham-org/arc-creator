'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, BrainCircuit, Code, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(() => {
      fetchJob();
    }, 2000); // Poll every 2 seconds for progress
    return () => clearInterval(interval);
  }, [id]);

  const fetchJob = async () => {
    try {
      const resp = await fetch(`/api/jobs/${id}`);
      const data = await resp.json();
      setJob(data);
      // Stop loading spinner once we have initial data
      if (loading) setLoading(false);
      
      // Stop polling if complete
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        // give it 1 final check then let the user decide
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cancelJob = async () => {
    if (!confirm('Are you sure you want to cancel this generation job?')) return;
    setIsCancelling(true);
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      fetchJob();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  if (!job) return <div className="text-center pt-20 text-red-500">Job not found.</div>;

  const getStatusColor = () => {
    switch (job.status) {
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <button 
          onClick={() => router.push('/jobs')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Jobs
        </button>
        {(job.status === 'pending' || job.status === 'running') && (
          <button
            onClick={cancelJob}
            disabled={isCancelling}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <XCircle size={16} /> {isCancelling ? 'Cancelling...' : 'Kill Job'}
          </button>
        )}
      </div>

      <div className={`p-6 border rounded-2xl ${getStatusColor()} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold capitalize">{job.status}</h1>
            {job.status === 'running' && <Loader2 className="animate-spin text-blue-600" size={20} />}
          </div>
          <p className="text-sm opacity-80 font-medium">Concept: {job.concept}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono opacity-60">ID: {job.id}</div>
          <div className="text-xs opacity-60">Model: {job.model || 'Auto-detecting...'}</div>
        </div>
      </div>

      {job.errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
          <AlertCircle className="shrink-0" />
          <div>
            <div className="font-bold">Error Occurred</div>
            <div className="text-sm">{job.errorMessage}</div>
          </div>
        </div>
      )}

      {job.status === 'completed' && job.puzzleId && (
        <button
          onClick={() => router.push(`/puzzle/${job.puzzleId}`)}
          className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 animate-pulse"
        >
          <CheckCircle2 size={24} /> Puzzle Ready! View Result
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thought Process */}
        <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-b flex items-center gap-2">
            <BrainCircuit className="text-blue-600" size={18} />
            <h2 className="font-bold text-blue-800 dark:text-blue-300">Thought Process</h2>
          </div>
          <div className="p-4 h-[500px] overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed bg-gray-50/30">
            {job.thought || 'Waiting for thoughts...'}
            {job.status === 'running' && <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />}
          </div>
        </div>

        {/* Content/JSON Progress */}
        <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 border-b flex items-center gap-2">
            <Code className="text-purple-600" size={18} />
            <h2 className="font-bold text-purple-800 dark:text-purple-300">Generated Logic</h2>
          </div>
          <div className="p-4 h-[500px] overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed bg-gray-50/30">
            {job.content || 'Output will appear here...'}
            {job.status === 'running' && <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-1" />}
          </div>
        </div>
      </div>
    </div>
  );
}
