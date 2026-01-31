# System Architecture: Model Performance Testing

## Data Flow Diagram

```
┌─────────────┐
│    User     │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Create Puzzle
       ▼
┌──────────────────────┐
│  POST /api/puzzles   │
│                      │
│  • Call LLM to gen   │
│  • Mark test cases   │
│  • Save to DB        │
└──────┬───────────────┘
       │
       │ Creates
       ▼
┌─────────────────────────────────┐
│         Database                 │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Puzzle  │  │ Generation   │ │
│  │  - id   │──│  - reasoning │ │
│  │  - idea │  │  - pairs[]   │ │
│  └─────────┘  └──────┬───────┘ │
│                      │          │
│                      │          │
│               ┌──────▼───────┐  │
│               │    Pair      │  │
│               │ - input      │  │
│               │ - output     │  │
│               │ - isTestCase │  │
│               └──────────────┘  │
└─────────────────────────────────┘
       │
       │ 2. User views puzzle
       │    and clicks "New Run"
       ▼
┌──────────────────────────────────┐
│ POST /api/generations/:id/runs   │
│                                   │
│  • Create ModelRun (pending)     │
│  • Return run ID                 │
└──────┬───────────────────────────┘
       │
       │ 3. Execute run
       ▼
┌──────────────────────────────────┐
│ POST /api/runs/:id/execute       │
│                                   │
│  • Update status to "running"    │
│  • Call executeModelRun()        │
│  • Return immediately            │
└──────┬───────────────────────────┘
       │
       │ Async execution
       ▼
┌──────────────────────────────────┐
│    Model Runner Library           │
│  (/lib/modelRunner.ts)            │
│                                   │
│  1. Separate training/test pairs │
│  2. Build prompt                 │
│  3. Call AI provider API         │
│  4. Parse response               │
│  5. Compare predictions          │
│  6. Calculate accuracy           │
│  7. Save to DB                   │
└──────┬───────────────────────────┘
       │
       │ Calls
       ▼
┌────────────────┬─────────────────┐
│   Anthropic    │     OpenAI      │
│   Claude API   │    GPT API      │
└────────────────┴─────────────────┘
       │
       │ Returns predictions
       ▼
┌─────────────────────────────────┐
│         Database                 │
│  ┌──────────────────┐            │
│  │   ModelRun       │            │
│  │  - status:       │            │
│  │    "completed"   │            │
│  │  - accuracy      │            │
│  │  - reasoning     │            │
│  └────┬─────────────┘            │
│       │                          │
│       │                          │
│  ┌────▼───────────────┐          │
│  │ ModelPrediction    │          │
│  │  - predicted       │          │
│  │  - expected        │          │
│  │  - isCorrect       │          │
│  └────────────────────┘          │
└─────────────────────────────────┘
       │
       │ 4. User polls for results
       │    (every 3 seconds)
       ▼
┌──────────────────────────────────┐
│   GET /api/runs/:id              │
│                                   │
│  • Fetch run with predictions    │
│  • Return full details           │
└──────┬───────────────────────────┘
       │
       │ Display results
       ▼
┌─────────────┐
│    User     │
│  (Browser)  │
│             │
│  Shows:     │
│  ✓ Accuracy │
│  ✓ Reasoning│
│  ✓ Grids    │
└─────────────┘
```

## Component Architecture

```
┌────────────────────────────────────────────────────┐
│              puzzle/[id]/page.tsx                   │
│  Main puzzle detail page with tab management       │
│                                                     │
│  ┌─────────────────┐  ┌────────────────────────┐  │
│  │ Tab: Review     │  │ Tab: Performances      │  │
│  └────────┬────────┘  └───────────┬────────────┘  │
│           │                       │                │
└───────────┼───────────────────────┼────────────────┘
            │                       │
            ▼                       ▼
┌───────────────────────┐  ┌──────────────────────────┐
│  PuzzleReviewTab      │  │ ModelPerformancesTab     │
│                       │  │                          │
│  • Color palette      │  │  • Run list              │
│  • Agent reasoning    │  │  • New run form          │
│  • Training examples  │  │  • Run details view      │
│  • Test cases         │  │  • Auto-polling          │
│                       │  │                          │
│  Uses:                │  │  Uses:                   │
│  - PuzzlePair ────────┼──┼─ ArcGrid                │
│  - ArcGrid            │  │                          │
└───────────────────────┘  └──────────────────────────┘
            │                       │
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Shared Components   │
            │                       │
            │  • ArcGrid            │
            │  • PuzzlePair         │
            │  • Navbar             │
            └───────────────────────┘
```

## Database Schema Relationships

```
┌─────────────┐
│   Puzzle    │
│             │
│  - id       │
│  - idea     │
│  - created  │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────────────┐
│    Generation       │
│                     │
│  - id               │
│  - puzzleId    ────┼─ FK to Puzzle
│  - parentGenId ────┼─ FK to self (tree structure)
│  - reasoning        │
│  - tokensUsed       │
│  - timeTakenMs      │
└──────┬──────────────┘
       │
       │ 1:N
       │
       ├──────────────────────┬─────────────────────┐
       │                      │                     │
       ▼                      ▼                     ▼
┌─────────────┐    ┌─────────────────┐   ┌──────────────┐
│    Pair     │    │   ModelRun      │   │  Feedback    │
│             │    │                 │   │              │
│  - id       │    │  - id           │   │  - id        │
│  - genId ───┼─┐  │  - genId   ─────┼─┐ │  - genId ────┼─┐
│  - input    │ │  │  - modelName    │ │ │  - text      │ │
│  - output   │ │  │  - provider     │ │ │  - gridEdits │ │
│  - order    │ │  │  - status       │ │ └──────────────┘ │
│  - isTest   │ │  │  - reasoning    │ │                  │
└──────┬──────┘ │  │  - accuracy     │ │                  │
       │        │  │  - tokensUsed   │ │                  │
       │        │  └─────────┬───────┘ │                  │
       │ FK     │            │         │ FK               │ FK
       └────────┘            │ 1:N     └──────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  ModelPrediction     │
                  │                      │
                  │  - id                │
                  │  - runId        ─────┼─ FK to ModelRun
                  │  - pairId       ─────┼─ FK to Pair
                  │  - predicted         │
                  │  - expected          │
                  │  - isCorrect         │
                  │  - reasoning         │
                  └──────────────────────┘
```

## API Request/Response Flow

### Creating a Run

**Request:**
```http
POST /api/generations/gen_abc/runs
Content-Type: application/json

{
  "modelName": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

**Response:**
```json
{
  "id": "run_xyz",
  "generationId": "gen_abc",
  "modelName": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "status": "pending",
  "metadata": {
    "temperature": 0.7,
    "maxTokens": 4000
  },
  "createdAt": "2026-01-31T10:30:00Z"
}
```

### Executing a Run

**Request:**
```http
POST /api/runs/run_xyz/execute
Content-Type: application/json

{
  "apiKey": "sk-ant-..."
}
```

**Response:**
```json
{
  "message": "Model run started"
}
```

### Getting Run Results

**Request:**
```http
GET /api/runs/run_xyz
```

**Response (Completed):**
```json
{
  "id": "run_xyz",
  "generationId": "gen_abc",
  "modelName": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "status": "completed",
  "reasoning": "The pattern shows a 90-degree clockwise rotation...",
  "correctCount": 2,
  "totalCount": 2,
  "accuracy": 1.0,
  "tokensUsed": 3245,
  "timeTakenMs": 5200,
  "predictions": [
    {
      "id": "pred_1",
      "runId": "run_xyz",
      "pairId": "pair_test1",
      "predicted": [[1, 2], [3, 4]],
      "expected": [[1, 2], [3, 4]],
      "isCorrect": true,
      "pair": {
        "id": "pair_test1",
        "input": [[4, 3], [2, 1]],
        "output": [[1, 2], [3, 4]],
        "isTestCase": true
      }
    }
  ],
  "createdAt": "2026-01-31T10:30:00Z",
  "updatedAt": "2026-01-31T10:30:05Z"
}
```

## State Machine: ModelRun Status

```
    ┌──────────┐
    │ pending  │ ← Initial state when run is created
    └────┬─────┘
         │
         │ POST /api/runs/:id/execute
         │
         ▼
    ┌──────────┐
    │ running  │ ← Currently executing
    └────┬─────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         │ Success      │ Error        │ Timeout
         │              │              │
         ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │completed │  │  failed  │  │  failed  │
    └──────────┘  └──────────┘  └──────────┘
    │             │             │
    │ Has:        │ Has:        │ Has:
    │ - accuracy  │ - error     │ - error
    │ - reasoning │   message   │   message
    │ - predictions              │
```

## Security Considerations

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ Sends API key in request body
       │ ⚠️ HTTPS required!
       │
       ▼
┌─────────────────┐
│   API Server    │
│                 │
│  • Receives key │
│  • Uses it once │
│  • Never stores │
│  • Discards     │
└──────┬──────────┘
       │
       │ Sends to provider
       │
       ▼
┌─────────────────┐
│  AI Provider    │
│  (Claude/GPT)   │
└─────────────────┘

⚠️ Future improvements:
  - Encrypt API keys in transit
  - User accounts with saved keys
  - Key validation before use
  - Rate limiting per user
```

## Performance Optimization

```
Browser                Server              Database
   │                      │                    │
   │ 1. Create run        │                    │
   ├─────────────────────>│                    │
   │                      │ Insert ModelRun    │
   │                      ├───────────────────>│
   │<─────────────────────┤                    │
   │ 2. Return run ID     │                    │
   │                      │                    │
   │ 3. Execute           │                    │
   ├─────────────────────>│                    │
   │                      │ Update: running    │
   │                      ├───────────────────>│
   │<─────────────────────┤                    │
   │ 4. Return immediate  │                    │
   │                      │                    │
   │                      │ 5. Async execution │
   │                      │ (in background)    │
   │                      │                    │
   │ 6. Poll (every 3s)   │                    │
   ├─────────────────────>│                    │
   │                      │ Select run         │
   │                      ├───────────────────>│
   │<─────────────────────┤                    │
   │ Still running...     │                    │
   │                      │                    │
   │ 7. Poll again        │                    │
   ├─────────────────────>│                    │
   │                      │ Select run         │
   │                      ├───────────────────>│
   │<─────────────────────┤                    │
   │ Completed! + data    │                    │
   │                      │                    │
```

## Extensibility Points

```
┌─────────────────────────────────────────┐
│         Add New AI Provider             │
│                                         │
│  1. Create provider function:           │
│     async function callNewProvider()    │
│                                         │
│  2. Add to modelRunner.ts switch:       │
│     if (provider === 'newProvider')     │
│                                         │
│  3. Update UI dropdown                  │
│                                         │
│  ✅ No database changes needed!         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Add New Evaluation Metric          │
│                                         │
│  1. Add field to ModelRun.metadata:     │
│     { ...existing, newMetric: value }   │
│                                         │
│  2. Calculate in modelRunner.ts         │
│                                         │
│  3. Display in UI                       │
│                                         │
│  ✅ No migration needed (JSON field)!   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Add Custom Test Case Types         │
│                                         │
│  1. Extend Pair.metadata:               │
│     { testType: 'hard' | 'easy' }       │
│                                         │
│  2. Filter in modelRunner.ts            │
│                                         │
│  3. Group in UI                         │
│                                         │
│  ✅ Backward compatible!                │
└─────────────────────────────────────────┘
```
