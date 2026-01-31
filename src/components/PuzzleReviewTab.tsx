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
  onEditInput,
  onEditOutput,
  onResizeInput,
  onResizeOutput,
}: PuzzleReviewTabProps) {
  // Separate training and test pairs
  const trainingPairs = editedPairs.filter(p => !p.isTestCase);
  const testPairs = editedPairs.filter(p => p.isTestCase);

  return (
    <div className="space-y-8">
      {/* Color Palette */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h2 className="text-xl font-semibold">Color Palette</h2>
        <div className="flex gap-1">
          {Object.keys(ARC_COLORS).map((c) => (
            <button
              key={c}
              className={`w-7 h-7 rounded border-2 transition-all ${
                selectedColor === Number(c) 
                  ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' 
                  : 'hover:scale-105'
              } ${ARC_COLORS[Number(c)]}`}
              onClick={() => setSelectedColor(Number(c))}
              title={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Agent Reasoning */}
      {currentGen?.reasoning && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="text-blue-600" size={22} />
            <h2 className="text-xl font-semibold">Agent Reasoning Trace</h2>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic leading-relaxed">
            {currentGen.reasoning}
          </div>
        </div>
      )}

      {/* Training Examples */}
      {trainingPairs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 pb-3 border-b mb-4">
            <h2 className="text-xl font-semibold">Training Examples ({trainingPairs.length})</h2>
            <div title="These pairs are used to demonstrate the pattern">
              <Info className="text-gray-400" size={16} />
            </div>
          </div>
          <div className="space-y-4">
            {trainingPairs.map((pair, idx) => (
              <PuzzlePair 
                key={pair.id || idx}
                input={pair.input}
                output={pair.output}
                onEditInput={(r, c) => onEditInput(editedPairs.indexOf(pair), r, c)}
                onEditOutput={(r, c) => onEditOutput(editedPairs.indexOf(pair), r, c)}
                onResizeInput={(rows, cols) => onResizeInput(editedPairs.indexOf(pair), rows, cols)}
                onResizeOutput={(rows, cols) => onResizeOutput(editedPairs.indexOf(pair), rows, cols)}
                editable
              />
            ))}
          </div>
        </div>
      )}

      {/* Test Cases */}
      {testPairs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 pb-3 border-b mb-4">
            <h2 className="text-xl font-semibold text-purple-600">Test Cases ({testPairs.length})</h2>
            <div title="These pairs are used to evaluate model performance">
              <Info className="text-purple-400" size={16} />
            </div>
          </div>
          <div className="space-y-4">
            {testPairs.map((pair, idx) => (
              <div key={pair.id || idx} className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/30 dark:bg-purple-900/10">
                <PuzzlePair 
                  input={pair.input}
                  output={pair.output}
                  onEditInput={(r, c) => onEditInput(editedPairs.indexOf(pair), r, c)}
                  onEditOutput={(r, c) => onEditOutput(editedPairs.indexOf(pair), r, c)}
                  onResizeInput={(rows, cols) => onResizeInput(editedPairs.indexOf(pair), rows, cols)}
                  onResizeOutput={(rows, cols) => onResizeOutput(editedPairs.indexOf(pair), rows, cols)}
                  editable
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* If no test cases exist, show message */}
      {testPairs.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            No test cases defined yet. Mark some pairs as test cases to evaluate model performance.
          </p>
        </div>
      )}
    </div>
  );
}
