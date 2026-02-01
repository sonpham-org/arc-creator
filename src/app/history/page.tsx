'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Clock, Hash, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import ArcGrid from '@/components/ArcGrid';

const PUZZLES_PER_PAGE = 30;

export default function HistoryPage() {
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/puzzles')
      .then(r => r.json())
      .then(data => {
        setPuzzles(data);
        setLoading(false);
      });
  }, []);

  // Collect all unique tags sorted alphabetically
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of puzzles) {
      if (p.tags) {
        for (const tag of p.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [puzzles]);

  // Filter puzzles by selected tags
  const filteredPuzzles = useMemo(() => {
    if (selectedTags.length === 0) return puzzles;
    return puzzles.filter(p =>
      p.tags && selectedTags.some((tag: string) => p.tags.includes(tag))
    );
  }, [puzzles, selectedTags]);

  const toggleTag = (tag: string) => {
    setCurrentPage(1);
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => {
    setCurrentPage(1);
    setSelectedTags([]);
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  const totalPages = Math.ceil(filteredPuzzles.length / PUZZLES_PER_PAGE);
  const startIdx = (currentPage - 1) * PUZZLES_PER_PAGE;
  const endIdx = startIdx + PUZZLES_PER_PAGE;
  const currentPuzzles = filteredPuzzles.slice(startIdx, endIdx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Puzzle Library</h1>
        <p className="text-gray-500">Browse and manage your ARC puzzle collection.</p>
      </div>

      {/* Tag Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-500">Filter by tag</span>
          {selectedTags.length > 0 && (
            <button
              onClick={clearTags}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-2"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(tag => {
            const isActive = selectedTags.includes(tag);
            const count = puzzles.filter(p => p.tags?.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                {tag} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentPuzzles.map((p) => {
          const firstPair = p.generations?.[0]?.pairs?.[0];
          const inputGrid = firstPair?.input;
          const outputGrid = firstPair?.output;
          const subtitle = p.idea !== p.id ? p.idea : (p.source || '');

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

              <div className="p-5 flex-1 flex flex-col space-y-2">
                <div>
                  <h2 className="text-sm font-bold font-mono group-hover:text-blue-600 transition-colors truncate">
                    {p.id}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
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

        {filteredPuzzles.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl text-gray-400">
            {selectedTags.length > 0
              ? 'No puzzles match the selected tags.'
              : 'No puzzles found. Create your first one to get started!'}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

              if (showEllipsis) {
                return <span key={page} className="px-2 text-gray-400">...</span>;
              }

              if (!showPage) return null;

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[40px] h-10 rounded-lg border transition-colors ${
                    currentPage === page
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Showing X of Y puzzles */}
      <div className="text-center text-sm text-gray-500 mt-4">
        Showing {filteredPuzzles.length > 0 ? startIdx + 1 : 0}-{Math.min(endIdx, filteredPuzzles.length)} of {filteredPuzzles.length} puzzles
        {selectedTags.length > 0 && ` (filtered from ${puzzles.length} total)`}
      </div>
    </div>
  );
}
