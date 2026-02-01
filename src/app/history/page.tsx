'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Clock, Hash, Tag } from 'lucide-react';
import ArcGrid from '@/components/ArcGrid';

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
        {puzzles.map((p) => {
          const firstPair = p.generations?.[0]?.pairs?.[0];
          const inputGrid = firstPair?.input;
          const outputGrid = firstPair?.output;
          
          return (
            <Link 
              key={p.id} 
              href={`/puzzle/${p.id}`}
              className="group block bg-white dark:bg-gray-900 border rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              {/* Thumbnail Area */}
              <div className="h-40 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center border-b group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 transition-colors overflow-hidden">
                {inputGrid ? (
                  <div className="flex items-center justify-center gap-2 h-full w-full p-2">
                    <div className="flex-1 flex items-center justify-center min-w-0 max-h-full">
                      <div className="max-w-full max-h-full overflow-hidden flex items-center justify-center">
                        <ArcGrid grid={inputGrid} cellSize="xs" />
                      </div>
                    </div>
                    {outputGrid && (
                      <>
                        <ArrowRight size={16} className="text-gray-400 shrink-0" />
                        <div className="flex-1 flex items-center justify-center min-w-0 max-h-full">
                          <div className="max-w-full max-h-full overflow-hidden flex items-center justify-center">
                            <ArcGrid grid={outputGrid} cellSize="xs" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-xs">Generating preview...</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold group-hover:text-blue-600 transition-colors truncate">
                    {p.idea}
                  </h2>
                  <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 shrink-0">
                    {p.id.slice(0, 8)}
                  </span>
                </div>
                
                {/* Tags */}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-auto pt-2">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <Hash size={12} />
                    {p._count?.generations || 0} versions
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {puzzles.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl text-gray-400">
            No puzzles found. Create your first one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
