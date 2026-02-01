'use client';

import React from 'react';
import ArcGrid from './ArcGrid';
import { ArrowRight } from 'lucide-react';

interface PuzzlePairProps {
  input: number[][];
  output: number[][] | null;
  onEditInput?: (r: number, c: number) => void;
  onEditOutput?: (r: number, c: number) => void;
  onResizeInput?: (rows: number, cols: number) => void;
  onResizeOutput?: (rows: number, cols: number) => void;
  editable?: boolean;
}

export default function PuzzlePair({ 
  input, 
  output, 
  onEditInput, 
  onEditOutput, 
  onResizeInput,
  onResizeOutput,
  editable 
}: PuzzlePairProps) {
  // Safety check
  if (!input || !Array.isArray(input) || input.length === 0) {
    return <div className="text-gray-400 p-4">Invalid puzzle data</div>;
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 w-full justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Input</span>
          {editable && onResizeInput && (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                className="w-9 text-xs border rounded p-1" 
                value={input.length} 
                onChange={(e) => onResizeInput(Number(e.target.value), input[0]?.length || 1)}
                min={1} max={30}
              />
              <span className="text-xs">×</span>
              <input 
                type="number" 
                className="w-9 text-xs border rounded p-1" 
                value={input[0]?.length || 1} 
                onChange={(e) => onResizeInput(input.length, Number(e.target.value))}
                min={1} max={30}
              />
            </div>
          )}
        </div>
        <ArcGrid grid={input} onCellClick={onEditInput} editable={editable} />
      </div>

      <div className="flex flex-col items-center">
        <ArrowRight className="text-gray-300 rotate-90 md:rotate-0" size={24} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 w-full justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Output</span>
          {editable && onResizeOutput && output && Array.isArray(output) && output.length > 0 && (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                className="w-9 text-xs border rounded p-1" 
                value={output.length} 
                onChange={(e) => onResizeOutput(Number(e.target.value), output[0]?.length || 1)}
                min={1} max={30}
              />
              <span className="text-xs">×</span>
              <input 
                type="number" 
                className="w-9 text-xs border rounded p-1" 
                value={output[0]?.length || 1} 
                onChange={(e) => onResizeOutput(output.length, Number(e.target.value))}
                min={1} max={30}
              />
            </div>
          )}
        </div>
        {output && Array.isArray(output) && output.length > 0 ? (
          <ArcGrid grid={output} onCellClick={onEditOutput} editable={editable} />
        ) : (
          <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <span className="text-xs text-gray-400">Hidden Test Output</span>
          </div>
        )}
      </div>
    </div>
  );
}
