/**
 * Import ARC puzzle datasets into the database.
 *
 * Usage:
 *   npx tsx scripts/import-datasets.ts [dataset...]
 *
 * Datasets:
 *   concept-arc         - 160 puzzles organized by concept (16 groups x 10)
 *   arc-community       - 23 community-created puzzles
 *   arc-dataset-tama    - 1,000 big ARC puzzles by neoneye
 *   arc-dataset-diva    - 1,200 tiny ARC puzzles by neoneye
 *   dbigham             - 21 community puzzles by dbigham
 *   nosound             - 9 community puzzles by nosound
 *   mini-arc            - 149 compact 5x5 grid puzzles
 *   sort-of-arc         - 20 sorting-focused puzzles
 *   synth-riddles       - 53 synthetic riddle puzzles
 *   all                 - Import all of the above
 *
 * Examples:
 *   npx tsx scripts/import-datasets.ts concept-arc
 *   npx tsx scripts/import-datasets.ts concept-arc arc-community
 *   npx tsx scripts/import-datasets.ts all
 *
 * Prerequisites:
 *   Clone datasets first:
 *     git clone --depth 1 https://github.com/victorvikram/ConceptARC.git /tmp/ConceptARC
 *     git clone --depth 1 https://github.com/neoneye/arc-dataset-collection.git /tmp/arc-dataset-collection
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ArcPuzzle {
  train: { input: number[][]; output: number[][] }[];
  test: { input: number[][]; output?: number[][] | null }[];
}

interface DatasetConfig {
  name: string;
  source: string;
  tags: string[];
  getFiles: () => { id: string; filePath: string; extraTags?: string[] }[];
}

// ─── Dataset Configurations ───────────────────────────────────────────

const CONCEPT_ARC_DIR = '/tmp/ConceptARC/corpus';
const NEONEYE_DIR = '/tmp/arc-dataset-collection/dataset';

function getConceptArcFiles(): { id: string; filePath: string; extraTags: string[] }[] {
  const files: { id: string; filePath: string; extraTags: string[] }[] = [];
  if (!fs.existsSync(CONCEPT_ARC_DIR)) {
    console.error(`ConceptARC not found at ${CONCEPT_ARC_DIR}. Clone it first.`);
    return files;
  }
  const groups = fs.readdirSync(CONCEPT_ARC_DIR).filter(d =>
    fs.statSync(path.join(CONCEPT_ARC_DIR, d)).isDirectory()
  );
  for (const group of groups) {
    const groupDir = path.join(CONCEPT_ARC_DIR, group);
    const jsonFiles = fs.readdirSync(groupDir).filter(f => f.endsWith('.json'));
    for (const file of jsonFiles) {
      const id = `concept-arc-${file.replace('.json', '').toLowerCase()}`;
      files.push({
        id,
        filePath: path.join(groupDir, file),
        extraTags: [group],
      });
    }
  }
  return files;
}

function getNeoneyeFiles(
  datasetName: string,
  prefix: string,
): { id: string; filePath: string; extraTags?: string[] }[] {
  const files: { id: string; filePath: string }[] = [];
  const baseDir = path.join(NEONEYE_DIR, datasetName, 'data');
  if (!fs.existsSync(baseDir)) {
    // Some datasets have nested directories (tama, diva)
    const altDir = path.join(NEONEYE_DIR, datasetName);
    if (!fs.existsSync(altDir)) {
      console.error(`Dataset not found at ${baseDir}`);
      return files;
    }
  }

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.endsWith('.json')) {
        const id = `${prefix}-${entry.replace('.json', '').toLowerCase()}`;
        files.push({ id, filePath: fullPath });
      }
    }
  }

  walkDir(path.join(NEONEYE_DIR, datasetName, 'data'));
  return files;
}

const DATASETS: Record<string, DatasetConfig> = {
  'concept-arc': {
    name: 'ConceptARC',
    source: 'concept-arc',
    tags: ['ConceptARC'],
    getFiles: () => getConceptArcFiles(),
  },
  'arc-community': {
    name: 'ARC Community',
    source: 'arc-community',
    tags: ['Community'],
    getFiles: () => getNeoneyeFiles('arc-community', 'community'),
  },
  'arc-dataset-tama': {
    name: 'ARC Dataset Tama (Big)',
    source: 'arc-dataset-tama',
    tags: ['Tama', 'Community'],
    getFiles: () => getNeoneyeFiles('arc-dataset-tama', 'tama'),
  },
  'arc-dataset-diva': {
    name: 'ARC Dataset Diva (Tiny)',
    source: 'arc-dataset-diva',
    tags: ['Diva', 'Community'],
    getFiles: () => getNeoneyeFiles('arc-dataset-diva', 'diva'),
  },
  'dbigham': {
    name: 'dbigham Community Puzzles',
    source: 'dbigham',
    tags: ['Community', 'dbigham'],
    getFiles: () => getNeoneyeFiles('dbigham', 'dbigham'),
  },
  'nosound': {
    name: 'nosound Community Puzzles',
    source: 'nosound',
    tags: ['Community', 'nosound'],
    getFiles: () => getNeoneyeFiles('nosound', 'nosound'),
  },
  'mini-arc': {
    name: 'Mini-ARC',
    source: 'mini-arc',
    tags: ['Mini-ARC'],
    getFiles: () => getNeoneyeFiles('Mini-ARC', 'mini-arc'),
  },
  'sort-of-arc': {
    name: 'Sort-of-ARC',
    source: 'sort-of-arc',
    tags: ['Sort-of-ARC'],
    getFiles: () => getNeoneyeFiles('Sort-of-ARC', 'sort-of-arc'),
  },
  'synth-riddles': {
    name: 'Synthetic Riddles',
    source: 'synth-riddles',
    tags: ['Synthetic Riddles'],
    getFiles: () => getNeoneyeFiles('synth_riddles', 'synth-riddle'),
  },
};

// ─── Import Logic ─────────────────────────────────────────────────────

async function importDataset(config: DatasetConfig) {
  const files = config.getFiles();
  if (files.length === 0) {
    console.log(`  ⚠ No files found for ${config.name}. Skipping.`);
    return { imported: 0, skipped: 0, failed: 0 };
  }

  console.log(`  Found ${files.length} puzzles`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      // Check if already exists
      const existing = await prisma.puzzle.findUnique({ where: { id: file.id } });
      if (existing) {
        skipped++;
        continue;
      }

      // Read and parse the JSON file
      const raw = fs.readFileSync(file.filePath, 'utf-8');
      const puzzleData: ArcPuzzle = JSON.parse(raw);

      if (!puzzleData.train || puzzleData.train.length === 0) {
        console.log(`  ⚠ ${file.id}: No training pairs, skipping`);
        failed++;
        continue;
      }

      // Build tags: base tags + any extra (e.g., concept group name)
      const tags = [...config.tags, ...(file.extraTags || [])];

      // Prepare pairs
      const trainPairs = puzzleData.train.map((pair, i) => ({
        input: pair.input,
        output: pair.output,
        order: i,
        isTestCase: false,
      }));

      const testPairs = (puzzleData.test || []).map((pair, i) => ({
        input: pair.input,
        output: pair.output ?? [],
        order: trainPairs.length + i,
        isTestCase: true,
      }));

      const allPairs = [...trainPairs, ...testPairs];

      // Create puzzle + generation + pairs in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.puzzle.create({
          data: {
            id: file.id,
            idea: file.id,
            source: config.source,
            tags,
          },
        });

        await tx.generation.create({
          data: {
            puzzleId: file.id,
            parentGenId: null,
            tokensUsed: 0,
            timeTakenMs: 0,
            reasoning: null,
            pairs: {
              create: allPairs,
            },
          },
        });
      });

      imported++;
    } catch (err: any) {
      console.error(`  ✗ ${file.id}: ${err.message}`);
      failed++;
    }
  }

  return { imported, skipped, failed };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/import-datasets.ts [dataset...]');
    console.log('');
    console.log('Available datasets:');
    for (const [key, config] of Object.entries(DATASETS)) {
      const count = config.getFiles().length;
      console.log(`  ${key.padEnd(22)} ${config.name} (${count} puzzles)`);
    }
    console.log(`  ${'all'.padEnd(22)} Import all datasets`);
    process.exit(0);
  }

  const datasetsToImport = args.includes('all') ? Object.keys(DATASETS) : args;

  // Validate dataset names
  for (const name of datasetsToImport) {
    if (!DATASETS[name]) {
      console.error(`Unknown dataset: ${name}`);
      console.error(`Available: ${Object.keys(DATASETS).join(', ')}, all`);
      process.exit(1);
    }
  }

  console.log(`Importing ${datasetsToImport.length} dataset(s)...\n`);

  const totals = { imported: 0, skipped: 0, failed: 0 };

  for (const name of datasetsToImport) {
    const config = DATASETS[name];
    console.log(`[${config.name}]`);

    const result = await importDataset(config);

    console.log(`  Imported: ${result.imported}, Skipped: ${result.skipped}, Failed: ${result.failed}\n`);

    totals.imported += result.imported;
    totals.skipped += result.skipped;
    totals.failed += result.failed;
  }

  console.log('─'.repeat(40));
  console.log(`Total: ${totals.imported} imported, ${totals.skipped} skipped, ${totals.failed} failed`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
