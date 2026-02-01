'use client';

import React, { useState } from 'react';
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
  // Separate training and test pairs with null safety
  const trainingPairs = (editedPairs || []).filter(p => p && !p.isTestCase);
  const testPairs = (editedPairs || []).filter(p => p && p.isTestCase);

  return (
    <div className="space-y-6">
      {/* Agent Reasoning - Only show if exists and not in edit mode */}
      {!editMode && currentGen?.reasoning && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="text-blue-600" size={22} />
            <h2 className="text-xl font-semibold">Agent Reasoning</h2>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic leading-relaxed">
            {currentGen.reasoning}
          </div>
        </div>
      )}

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
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
