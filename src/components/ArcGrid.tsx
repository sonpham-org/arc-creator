'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ARC_COLORS: Record<number, string> = {
  0: 'bg-[#000000]', // black
  1: 'bg-[#0074D9]', // blue
  2: 'bg-[#FF4136]', // red
  3: 'bg-[#2ECC40]', // green
  4: 'bg-[#FFDC00]', // yellow
  5: 'bg-[#AAAAAA]', // gray
  6: 'bg-[#F012BE]', // magenta
  7: 'bg-[#FF851B]', // orange
  8: 'bg-[#7FDBFF]', // cyan
  9: 'bg-[#870C25]', // maroon
};

interface ArcGridProps {
  grid: number[][];
  onCellClick?: (r: number, c: number) => void;
  editable?: boolean;
  selectedColor?: number;
  cellSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function ArcGrid({ grid, onCellClick, editable, selectedColor, cellSize = 'md' }: ArcGridProps) {
  if (!grid || grid.length === 0) return null;

  const sizeClasses = {
    xs: "w-1 h-1 sm:w-2 sm:h-2",
    sm: "w-3 h-3 sm:w-4 sm:h-4",
    md: "w-6 h-6 sm:w-8 sm:h-8",
    lg: "w-10 h-10 sm:w-12 sm:h-12",
  };

  return (
    <div 
      className="inline-grid gap-px border border-gray-700 bg-gray-700" 
      style={{ 
        gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
        width: 'fit-content'
      }}
    >
      {grid.map((row, r) => (
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className={cn(
              sizeClasses[cellSize],
              "transition-colors",
              editable && "cursor-pointer",
              ARC_COLORS[cell] || 'bg-white'
            )}
            onClick={() => onCellClick?.(r, c)}
          />
        ))
      ))}
    </div>
  );
}
