'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { ARC_COLORS } from '@/components/ArcGrid';
import PuzzlePair from '@/components/PuzzlePair';
import { BrainCircuit, Info } from 'lucide-react';

interface PuzzleReviewTabProps {
  currentGen: any;
  editedPairs: any[];
  selectedColor: number;
  setSelectedColor: (color: number) => void;
  editMode: boolean;
  onEditInput: (pairIndex: number, r: number, c: number) => void;
  onEditOutput: (pairIndex: number, r: number, c: number) => void;
  onResizeInput: (pairIndex: number, rows: number, cols: number) => void;
  onResizeOutput: (pairIndex: number, rows: number, cols: number) => void;
}

export default function PuzzleReviewTab({
  currentGen,
  editedPairs,
  selectedColor,
  setSelectedColor,
  editMode,
  onEditInput,
  onEditOutput,
  onResizeInput,
  onResizeOutput,
}: PuzzleReviewTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Separate training and test pairs with null safety
  const trainingPairs = (editedPairs || []).filter(p => p && !p.isTestCase);
  const testPairs = (editedPairs || []).filter(p => p && p.isTestCase);

  // Compute a uniform cell size that fits all pairs within the container
  const cellSize = useMemo(() => {
    if (!containerWidth || editedPairs.length === 0) return 32;

    // PuzzlePair overhead: p-4 (32px padding) + gap-4 (16px) + arrow (24px) + gap-4 (16px) + outer borders (8px)
    const pairOverhead = 96;
    // Additional overhead from the wrapping containers (border-2 + p-3 for test cases)
    const wrapperOverhead = 24;
    const availableWidth = containerWidth - pairOverhead - wrapperOverhead;

    let maxTotalCols = 1;
    for (const pair of editedPairs) {
      if (!pair) continue;
      const inputCols = pair.input?.[0]?.length || 1;
      const outputCols = pair.output?.[0]?.length || 1;
      const totalCols = inputCols + (pair.output ? outputCols : 0);
      if (totalCols > maxTotalCols) maxTotalCols = totalCols;
    }

    const computed = Math.floor(availableWidth / maxTotalCols);
    // Clamp between 4px and 48px
    return Math.max(4, Math.min(48, computed));
  }, [containerWidth, editedPairs]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Training Examples */}
      {trainingPairs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Training Examples</h3>
          <div className="space-y-3">
            {trainingPairs.map((pair, idx) => (
              <div key={pair.id || idx} className={editMode ? 'border-2 border-red-400 rounded-xl' : ''}>
                <PuzzlePair 
                  input={pair.input}
                  output={pair.output}
                  onEditInput={(r, c) => onEditInput(editedPairs.indexOf(pair), r, c)}
                  onEditOutput={(r, c) => onEditOutput(editedPairs.indexOf(pair), r, c)}
                  onResizeInput={(rows, cols) => onResizeInput(editedPairs.indexOf(pair), rows, cols)}
                  onResizeOutput={(rows, cols) => onResizeOutput(editedPairs.indexOf(pair), rows, cols)}
                  editable={editMode}
                  cellSize={cellSize}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Cases */}
      {testPairs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-purple-600">Test Cases</h3>
          <div className="space-y-3">
            {testPairs.map((pair, idx) => (
              <div key={pair.id || idx} className={`border-2 rounded-xl p-3 ${editMode ? 'border-red-400 bg-red-50/20' : 'border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-900/10'}`}>
                <PuzzlePair 
                  input={pair.input}
                  output={pair.output}
                  onEditInput={(r, c) => onEditInput(editedPairs.indexOf(pair), r, c)}
                  onEditOutput={(r, c) => onEditOutput(editedPairs.indexOf(pair), r, c)}
                  onResizeInput={(rows, cols) => onResizeInput(editedPairs.indexOf(pair), rows, cols)}
                  onResizeOutput={(rows, cols) => onResizeOutput(editedPairs.indexOf(pair), rows, cols)}
                  editable={editMode}
                  cellSize={cellSize}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
