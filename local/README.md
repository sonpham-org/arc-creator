# ARC Puzzle Bulk Generator

This folder contains scripts for bulk puzzle generation and management.

## Scripts

### `generate_puzzles.py`

Generates multiple ARC puzzle concepts using Google Gemini and creates them on your server.

### `import_arc_puzzles.py`

Imports official ARC puzzles from the 2024/2025 datasets into the platform.

#### Installation

```bash
pip install google-generativeai requests
```

#### Usage

```bash
# Set your API keys
export GEMINI_API_KEY="your-gemini-key"
export PUZZLE_API_KEY="sk-ant-..."  # Your Anthropic/OpenAI key

# Generate 10 puzzles (default)
python generate_puzzles.py

# Generate 100 puzzles
python generate_puzzles.py --count 100

# Use a different server
python generate_puzzles.py --count 50 --server https://your-app.railway.app

# Adjust delay between requests (to avoid rate limits)
python generate_puzzles.py --count 100 --delay 3.0
```

#### Features

- ✅ Uses Gemini to brainstorm diverse, creative concepts
- ✅ Creates jobs on the server for tracking
- ✅ Generates puzzles with content-based IDs
- ✅ Tracks success/failure rates
- ✅ Handles duplicate puzzles gracefully
- ✅ Respects rate limits with configurable delays

#### How It Works

1. **Concept Generation**: Gemini brainstorms N diverse puzzle concepts
2. **Job Creation**: Creates a job entry for each concept on the server
3. **Puzzle Creation**: Calls the puzzle API to generate each puzzle
4. **Status Tracking**: Updates job status (pending → running → completed/failed)
5. **Summary**: Shows statistics and links to view results

#### Example Output

```
============================================================
🚀 ARC Puzzle Bulk Generator
============================================================
Server: http://localhost:3000
Concepts to generate: 10
Delay between requests: 2.0s
============================================================

🧠 Brainstorming 10 diverse puzzle concepts with Gemini...

✅ Generated 10 concepts!

📋 Preview of concepts:
  1. Mirror the pattern horizontally
  2. Rotate each colored region 90 degrees clockwise
  3. Apply gravity to make colored cells fall downward
  4. Connect all cells of the same color with lines
  5. Tile the input pattern in a 2x2 grid
  ... and 5 more

📤 Creating jobs on server...
  [1/10] Creating job: Mirror the pattern horizontally...
    ✓ Job created: abc123

...

📊 Summary
============================================================
Total concepts: 10
Jobs created: 10
Puzzles successful: 9
Puzzles failed: 1
Success rate: 90.0%
============================================================

🌐 View results at: http://localhost:3000/history
```

## Tips

### Rate Limiting

If you're generating many puzzles:
- Use `--delay 3` or higher to avoid rate limits
- Generate in batches (e.g., 10-20 at a time)
- Monitor your API usage

### Cost Estimation

- Gemini: ~1 concept per 100 tokens (~$0.00001/concept)
- Claude/GPT: ~2000-5000 tokens per puzzle (~$0.01-0.05/puzzle)
- 100 puzzles ≈ $1-5 depending on model

### Best Practices

1. **Start small**: Test with 5-10 puzzles first
2. **Check results**: Review generated puzzles before scaling up
3. **Use staging**: Point to a development server, not production
4. **Monitor costs**: Keep track of API usage
5. **Save output**: Redirect to a file for logging: `python generate_puzzles.py > log.txt`

## Troubleshooting

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY="your-key-here"
```

### "Connection refused"
Make sure your server is running:
```bash
npm run dev
```

### Rate limits exceeded
Increase the delay:
```bash
python generate_puzzles.py --delay 5.0
```

### Import error
Install dependencies:
```bash
pip install google-generativeai requests
```

---

## Importing Official ARC Puzzles

Use `import_arc_puzzles.py` to import official ARC datasets from 2024 and 2025.

### Usage

```bash
# Set admin key
export ADMIN_KEY="your_admin_secret_key"

# Import ARC 2024 training set
python import_arc_puzzles.py --source arc-2024-training

# Import ARC 2025 evaluation set to production
python import_arc_puzzles.py --source arc-2025-evaluation --server https://your-app.railway.app

# Test with limited puzzles first
python import_arc_puzzles.py --source arc-2024-training --limit 10
```

### Available Sources

- `arc-2024-training` - 400 training puzzles
- `arc-2024-evaluation` - 400 evaluation puzzles  
- `arc-2024-test` - 100 test puzzles (no solutions)
- `arc-2025-training` - Training puzzles from 2025
- `arc-2025-evaluation` - Evaluation puzzles from 2025
- `arc-2025-test` - Test puzzles from 2025

### Features

- ✅ Bulk import official ARC puzzles
- ✅ Preserves original ARC puzzle IDs
- ✅ Marks puzzles with source (e.g., "arc-2024-training")
- ✅ Properly designates train/test pairs
- ✅ Skips existing puzzles (safe to re-run)
- ✅ Detailed import statistics

### Parent-Child Tracking

**Official ARC puzzles are marked as "OG" (original)** with:
- `source` field set to dataset (e.g., `arc-2024-training`)
- `parentGenId` set to `null` (no parent)
- Original ARC ID preserved

When you create refinements via feedback:
- New generations link back via `parentGenId`
- Full history graph maintained
- Example: ARC puzzle → User refinement → AI iteration → etc.

### How It Works

1. Reads JSON files from `/data/arc-{year}/` directory
2. Sends bulk import request to `/api/admin/puzzles/import`
3. Admin API verifies admin key
4. Creates Puzzle + Generation for each entry
5. Preserves train/test designation
6. Returns statistics (imported/skipped/failed)
