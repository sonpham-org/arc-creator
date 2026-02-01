# ARC Puzzle Datasets - Import Guide

## Summary

There are thousands of ARC puzzles available across multiple datasets. All use the same JSON format.

## Universal JSON Format

Every ARC dataset uses this structure (one file per puzzle):

```json
{
  "train": [
    {"input": [[0, 1, 2], [3, 4, 5]], "output": [[5, 4, 3], [2, 1, 0]]}
  ],
  "test": [
    {"input": [[1, 0], [0, 1]], "output": [[1, 0], [0, 1]]}
  ]
}
```

- Grid values: integers 0-9 (mapped to ARC colors)
- Grid dimensions: 1x1 to 30x30
- File naming: `{hex_id}.json` (e.g., `007bbfb7.json`)

## Priority Datasets to Import

### Tier 1: Official Datasets (Import First)

| Dataset | Puzzles | License | Source |
|---|---|---|---|
| **ARC-AGI-1** | 800 (400 train + 400 eval) | Apache-2.0 | [github.com/fchollet/ARC-AGI](https://github.com/fchollet/ARC-AGI) |
| **ARC-AGI-2** | 1,120 public (1000 train + 120 eval) | Apache-2.0 | [github.com/arcprize/ARC-AGI-2](https://github.com/arcprize/ARC-AGI-2) |

```bash
git clone https://github.com/fchollet/ARC-AGI.git
git clone https://github.com/arcprize/ARC-AGI-2.git
```

### Tier 2: Curated Community Datasets

| Dataset | Puzzles | License | Source |
|---|---|---|---|
| **ConceptARC** | 160 (16 concept groups x 10) | CC BY 4.0 | [github.com/victorvikram/ConceptARC](https://github.com/victorvikram/ConceptARC) |
| **Mini-ARC** | ~114 (5x5 grids) | -- | [github.com/KSB21ST/MINI-ARC](https://github.com/KSB21ST/MINI-ARC) |
| **1D-ARC** | ~20 tasks | MIT | [github.com/khalil-research/1D-ARC](https://github.com/khalil-research/1D-ARC) |

### Tier 3: Large Synthetic Datasets

| Dataset | Puzzles | License | Source |
|---|---|---|---|
| **RE-ARC** | 400,000 (1K per task) | MIT | [github.com/michaelhodel/re-arc](https://github.com/michaelhodel/re-arc) |
| **BARC Synthetic** | ~400K+ | Varies | [HuggingFace barc0 collection](https://huggingface.co/collections/barc0/synthetic-arc-dataset-6725aa6031376d3bacc34f76) |

### Tier 4: Annotated/Research Datasets

| Dataset | Content | License | Source |
|---|---|---|---|
| **LARC** | NL descriptions for ~704 ARC tasks | CC BY 4.0 | [github.com/samacqua/LARC](https://github.com/samacqua/LARC) |
| **H-ARC** | 15,500 human attempts on all 800 tasks | CC0 1.0 | [github.com/Le-Gris/h-arc](https://github.com/Le-Gris/h-arc) |

### Meta-Collection (All-in-One)

**neoneye/arc-dataset-collection** aggregates 17+ datasets in a unified format:
- [github.com/neoneye/arc-dataset-collection](https://github.com/neoneye/arc-dataset-collection)
- Includes: ARC-AGI-1, ARC-AGI-2, RE-ARC, ConceptARC, Mini-ARC, community puzzles, and more
- Online browser: [neoneye.github.io/arc](https://neoneye.github.io/arc/)

## Import Strategy

### Step 1: Import ARC-AGI-1 + ARC-AGI-2 (~1,920 puzzles)

These are the canonical datasets. Tag them appropriately:
- ARC-AGI-1 training: tag `arc-agi-1`, `training`
- ARC-AGI-1 evaluation: tag `arc-agi-1`, `evaluation`
- ARC-AGI-2 training: tag `arc-agi-2`, `training`
- ARC-AGI-2 evaluation: tag `arc-agi-2`, `evaluation`

### Step 2: Import ConceptARC (+160 puzzles)

Tag with `concept-arc` and the concept group name (e.g., `symmetry`, `rotation`).

### Step 3: Import from neoneye collection (community puzzles)

Cherry-pick interesting community datasets. Tag by source.

### Step 4: Synthetic datasets (optional, for scale)

RE-ARC and BARC are massive. Consider importing a curated subset (e.g., 1K from RE-ARC) rather than all 400K.

## Existing Import Script

The project already has an import mechanism via `/api/admin/puzzles/import`. Check the existing import script to see how it maps the ARC JSON format to the database schema (pairs with `input`, `output`, `isTestCase` fields).

## Warning: AI2 ARC vs Chollet's ARC

Do NOT confuse these datasets with **AI2's ARC** ([huggingface.co/datasets/allenai/ai2_arc](https://huggingface.co/datasets/allenai/ai2_arc)), which is a text-based multiple-choice science question dataset. Completely different benchmark despite sharing the acronym.
