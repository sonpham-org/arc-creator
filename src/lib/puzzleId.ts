import crypto from 'crypto';

/**
 * Generate a content-based hash ID for a puzzle
 * Uses 16 hex characters (vs 25 for cuid) to distinguish from normal IDs
 */
export function generatePuzzleId(pairs: any[]): string {
  // Sort pairs by order to ensure consistent hashing
  const sortedPairs = [...pairs].sort((a, b) => a.order - b.order);
  
  // Create a canonical string representation
  const content = JSON.stringify(sortedPairs.map(p => ({
    input: p.input,
    output: p.output,
    order: p.order
  })));
  
  // Hash and take first 16 hex chars (64 bits)
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.substring(0, 16);
}

/**
 * Check if an ID is a content-based hash (16 chars) or a standard format
 */
export function isContentBasedId(id: string): boolean {
  return /^[0-9a-f]{16}$/.test(id);
}

/**
 * Check if an ID is from the ARC dataset (follows ARC naming convention)
 */
export function isArcDatasetId(id: string): boolean {
  // ARC IDs are typically like: 00d62c1b, 007bbfb7 (8 hex chars)
  return /^[0-9a-f]{8}$/.test(id);
}
