# Bulk Puzzle Generation System

## Overview

This feature allows you to generate hundreds of diverse ARC puzzles automatically using Google Gemini for concept brainstorming and your choice of AI model for puzzle generation.

## Key Features

### 1. Content-Based Puzzle IDs
- **16-character hex IDs** (vs 25-char cuids) to distinguish bulk-generated puzzles
- **Deterministic hashing** - same puzzle content always gets the same ID
- **Deduplication** - automatically prevents creating duplicate puzzles
- **ARC dataset compatible** - supports loading existing ARC puzzles (8-char IDs)

### 2. Job Tracking System
- Track all bulk generation jobs in the database
- Monitor status: `pending` → `running` → `completed`/`failed`
- Link jobs to created puzzles
- View comprehensive stats and metrics

### 3. Gemini-Powered Brainstorming
- Generate diverse, creative puzzle concepts
- Automatic categorization across concept types
- Smart variety to avoid repetition

## Architecture

### Database Schema

```prisma
model Puzzle {
  id      String  // 16-char hash (content-based) or 8-char (ARC dataset)
  idea    String
  source  String  // "generated" or "arc-dataset"
  jobId   String? // Link to bulk generation job
  ...
}

model Job {
  id           String
  concept      String    // The concept sent to LLM
  status       String    // pending, running, completed, failed
  puzzleId     String?   // Created puzzle ID
  puzzles      Puzzle[]
  errorMessage String?
  model        String?
  tokensUsed   Int?
  timeTakenMs  Int?
  ...
}
```

### ID Formats

| Type | Format | Example | Usage |
|------|--------|---------|-------|
| Content Hash | 16 hex chars | `a3f2c9e1b4d6f8a2` | Bulk-generated puzzles |
| ARC Dataset | 8 hex chars | `007bbfb7` | Original ARC puzzles |
| CUID | 25 alphanumeric | `clxy123abc...` | Legacy/other uses |

## Usage

### Setup

```bash
cd local

# Install dependencies
./setup.sh

# Or manually:
pip3 install -r requirements.txt
```

### Environment Variables

```bash
# Google Gemini API key (for concept generation)
export GEMINI_API_KEY="your-gemini-api-key"

# Anthropic or OpenAI key (for puzzle generation)
export PUZZLE_API_KEY="sk-ant-..."
```

### Generate Puzzles

```bash
# Generate 10 puzzles (default)
python3 generate_puzzles.py

# Generate 100 puzzles
python3 generate_puzzles.py --count 100

# Point to production server
python3 generate_puzzles.py --count 50 --server https://your-app.railway.app

# Adjust delay to avoid rate limits
python3 generate_puzzles.py --count 100 --delay 3.0
```

### Example Output

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
    ✓ Job created: cly1abc123

📊 Summary
============================================================
Total concepts: 10
Jobs created: 10
Puzzles successful: 9
Puzzles failed: 1
Success rate: 90.0%
============================================================

🌐 View results at: http://localhost:3000/jobs
```

## Monitoring Jobs

### Via Web Interface

1. Navigate to http://localhost:3000/jobs
2. View real-time status dashboard with auto-refresh
3. Filter by status (pending, running, completed, failed)
4. Click to view created puzzles

### Via API

```bash
# List all jobs
curl http://localhost:3000/api/jobs

# Filter by status
curl http://localhost:3000/api/jobs?status=completed

# Get specific job
curl http://localhost:3000/api/jobs/{job-id}
```

## How It Works

### Step 1: Concept Generation
```
User specifies count (e.g., 100)
         ↓
Gemini brainstorms diverse concepts
         ↓
Returns JSON array of concept strings
```

### Step 2: Job Creation
```
For each concept:
  1. POST /api/jobs → Create job (status: pending)
  2. Store concept, model, timestamp
  3. Return job ID
```

### Step 3: Puzzle Generation
```
For each job:
  1. POST /api/puzzles with jobId
  2. Server updates job status → running
  3. LLM generates puzzle pairs
  4. Calculate content-based hash ID
  5. Check if puzzle exists (deduplication)
  6. Save puzzle or link to existing
  7. Update job status → completed/failed
```

### Step 4: Monitoring
```
Jobs page auto-refreshes every 5 seconds
Shows stats: total, pending, running, completed, failed
Links to created puzzles for viewing/testing
```

## Content-Based IDs Explained

### How Hashing Works

```typescript
// Puzzle pairs → sorted → JSON → SHA-256 → first 16 hex chars
const pairs = [
  { input: [[1,0],[0,1]], output: [[0,1],[1,0]], order: 0 },
  { input: [[2,3],[4,5]], output: [[5,4],[3,2]], order: 1 }
];

// Sort by order for consistency
const sorted = pairs.sort((a, b) => a.order - b.order);

// Create canonical representation
const content = JSON.stringify(sorted);

// Hash
const hash = sha256(content).substring(0, 16);
// Result: "a3f2c9e1b4d6f8a2"
```

### Benefits

1. **Deduplication**: Same puzzle = same ID automatically
2. **Idempotency**: Can safely re-run generation without duplicates
3. **Traceability**: ID directly linked to content
4. **Compatibility**: Distinguishable from ARC dataset IDs

## Cost Estimation

| Component | Typical Usage | Cost per Puzzle |
|-----------|--------------|----------------|
| Gemini (concept) | ~100 tokens | ~$0.00001 |
| Claude/GPT (puzzle) | 2000-5000 tokens | $0.01-0.05 |
| **Total** | | **~$0.01-0.05** |

**Example**: 100 puzzles ≈ $1-5

## Best Practices

### 1. Start Small
Test with 5-10 puzzles before scaling to 100+

### 2. Use Delays
```bash
# Avoid rate limits
python3 generate_puzzles.py --count 100 --delay 3.0
```

### 3. Monitor Costs
- Track token usage in job stats
- Set budget alerts in your AI provider dashboard

### 4. Check Quality
- Review generated puzzles manually
- Adjust prompts if quality is low
- Use model performance testing to validate

### 5. Use Staging
```bash
# Don't test on production!
python3 generate_puzzles.py --server https://staging.railway.app
```

## Troubleshooting

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY="your-key"
```

### "Connection refused"
Ensure server is running:
```bash
npm run dev
```

### Rate limit exceeded
Increase delay:
```bash
python3 generate_puzzles.py --delay 5.0
```

### Low quality puzzles
- Check your PUZZLE_API_KEY is valid
- Try different models (GPT-4 vs Claude)
- Review Gemini concepts for clarity

### Duplicate puzzles
This is normal! Content-based IDs prevent duplicates automatically.
The system will link to existing puzzle if content matches.

## Advanced Usage

### Custom Concept List

Create `concepts.txt`:
```
Mirror pattern horizontally
Rotate 90 degrees clockwise
Apply gravity downward
...
```

Modify script to read from file instead of Gemini.

### Parallel Generation

Run multiple instances with different concept ranges:
```bash
# Terminal 1
python3 generate_puzzles.py --count 50

# Terminal 2  
python3 generate_puzzles.py --count 50

# Deduplication ensures no conflicts!
```

### Production Deployment

```bash
# Use Railway database
export DATABASE_URL="postgresql://..."

# Deploy script as cron job
0 2 * * * /path/to/generate_puzzles.py --count 20
```

## API Reference

### POST /api/jobs
Create a new job

**Request:**
```json
{
  "concept": "Mirror the pattern horizontally",
  "model": "gemini-generated"
}
```

**Response:**
```json
{
  "id": "cly1abc123",
  "concept": "Mirror the pattern horizontally",
  "status": "pending",
  "model": "gemini-generated",
  "createdAt": "2026-01-31T..."
}
```

### GET /api/jobs
List jobs (with optional filtering)

**Query params:**
- `status`: pending, running, completed, failed
- `limit`: max results (default: 100)

### GET /api/jobs/:id
Get job details with linked puzzles

### POST /api/puzzles (with jobId)
Create puzzle linked to a job

**Request:**
```json
{
  "idea": "Mirror horizontally",
  "apiKey": "sk-ant-...",
  "model": null,
  "jobId": "cly1abc123"
}
```

## Future Enhancements

1. **Batch processing**: Queue system for large jobs
2. **Quality filters**: Auto-reject low-quality puzzles
3. **Concept templates**: Pre-defined concept categories
4. **Progress tracking**: Real-time progress bars
5. **Cost estimation**: Pre-calculate costs before running
6. **Scheduling**: Cron-like scheduled generation
7. **Webhooks**: Notify when jobs complete
8. **Analytics**: Track concept → success rate

## Files Created

```
local/
├── generate_puzzles.py    # Main bulk generation script
├── requirements.txt       # Python dependencies
├── setup.sh              # Quick setup script
└── README.md             # Documentation

src/
├── app/
│   ├── api/
│   │   └── jobs/
│   │       ├── route.ts         # List/create jobs
│   │       └── [id]/route.ts    # Get/update job
│   └── jobs/
│       └── page.tsx             # Jobs monitoring page
└── lib/
    └── puzzleId.ts              # Content-based ID utilities
```

---

**Ready to generate some puzzles? 🎨**

```bash
cd local
./setup.sh
export GEMINI_API_KEY="..."
export PUZZLE_API_KEY="sk-ant-..."
python3 generate_puzzles.py --count 10
```
