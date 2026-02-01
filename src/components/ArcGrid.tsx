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
  cellSize?: 'xs' | 'sm' | 'md' | 'lg' | number;
}

export default function ArcGrid({ grid, onCellClick, editable, selectedColor, cellSize = 'md' }: ArcGridProps) {
  if (!grid || grid.length === 0) return null;

  const sizeMap = {
    xs: 8,
    sm: 16,
    md: 32,
    lg: 48,
  };

  const cellPx = typeof cellSize === 'number' ? cellSize : sizeMap[cellSize];
  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div
      className="inline-block border-2 border-gray-700"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
        }}
      >
        {grid.map((row, r) => (
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "transition-colors border border-gray-700",
                editable && "cursor-pointer hover:opacity-80",
                ARC_COLORS[cell] || 'bg-white'
              )}
              style={{
                width: `${cellPx}px`,
                height: `${cellPx}px`,
              }}
              onClick={() => editable && onCellClick?.(r, c)}
            />
          ))
        ))}
      </div>
    </div>
  );
}
