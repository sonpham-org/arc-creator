'use client';

import React from 'react';
import ArcGrid from './ArcGrid';
import { ArrowRight } from 'lucide-react';

interface PuzzlePairProps {
  input: number[][];
  output: number[][];
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
  return (
    <div className="flex flex-col md:flex-row items-center gap-8 p-6 border rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 w-full justify-between">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Input</span>
          {editable && onResizeInput && (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                className="w-10 text-xs border rounded p-1" 
                value={input.length} 
                onChange={(e) => onResizeInput(Number(e.target.value), input[0].length)}
                min={1} max={30}
              />
              <span className="text-xs">×</span>
              <input 
                type="number" 
                className="w-10 text-xs border rounded p-1" 
                value={input[0].length} 
                onChange={(e) => onResizeInput(input.length, Number(e.target.value))}
                min={1} max={30}
              />
            </div>
          )}
        </div>
        <ArcGrid grid={input} onCellClick={onEditInput} editable={editable} />
      </div>

      <div className="flex flex-col items-center">
        <ArrowRight className="text-gray-300 rotate-90 md:rotate-0" size={32} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 w-full justify-between">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Output</span>
          {editable && onResizeOutput && (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                className="w-10 text-xs border rounded p-1" 
                value={output.length} 
                onChange={(e) => onResizeOutput(Number(e.target.value), output[0].length)}
                min={1} max={30}
              />
              <span className="text-xs">×</span>
              <input 
                type="number" 
                className="w-10 text-xs border rounded p-1" 
                value={output[0].length} 
                onChange={(e) => onResizeOutput(output.length, Number(e.target.value))}
                min={1} max={30}
              />
            </div>
          )}
        </div>
        <ArcGrid grid={output} onCellClick={onEditOutput} editable={editable} />
      </div>
    </div>
  );
}
