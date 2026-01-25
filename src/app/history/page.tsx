'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Clock, Hash } from 'lucide-react';

export default function HistoryPage() {
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/puzzles')
      .then(r => r.json())
      .then(data => {
        setPuzzles(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Puzzle Library</h1>
        <p className="text-gray-500">Resume work on your existing ARC challenge designs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {puzzles.map((p) => (
          <Link 
            key={p.id} 
            href={`/puzzle/${p.id}`}
            className="group block p-6 bg-white dark:bg-gray-900 border rounded-2xl hover:border-blue-500 hover:shadow-md transition-all space-y-4"
          >
            <h2 className="text-xl font-bold line-clamp-2 group-hover:text-blue-600 transition-colors">
              {p.idea}
            </h2>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                {(p._count?.generations || 0) > 0 ? (
                  <>
                    <Hash size={14} />
                    {p._count.generations} versions
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-blue-500 font-medium">
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center text-blue-600 font-medium text-sm gap-1">
              Resume iteration <ArrowRight size={16} />
            </div>
          </Link>
        ))}

        {puzzles.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl text-gray-400">
            No puzzles found. Create your first one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
