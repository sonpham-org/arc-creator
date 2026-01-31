# Model Performance Testing Feature

## Overview

This feature allows you to test how different AI models perform on the puzzles you create. Each puzzle can now be evaluated by multiple models, with detailed tracking of their reasoning and accuracy.

## Database Schema

### New Tables

#### `ModelRun`
Tracks each evaluation run by a model on a puzzle generation:
- `modelName`: The model used (e.g., "gpt-4", "claude-3.5-sonnet")
- `provider`: The API provider ("openai", "anthropic")
- `status`: Current status (pending, running, completed, failed)
- `reasoning`: The model's explanation of the pattern it discovered
- `accuracy`: Percentage of test cases solved correctly
- `tokensUsed`, `timeTakenMs`: Performance metrics
- `metadata`: Extensible JSON field for additional configuration

#### `ModelPrediction`
Stores individual predictions for each test case:
- `predicted`: The model's predicted output grid
- `expected`: The actual correct output
- `isCorrect`: Whether the prediction matched
- `reasoning`: Model's explanation for this specific prediction

### Updated Tables

#### `Pair`
Added `isTestCase` boolean field:
- `true`: This pair is used to evaluate models (hidden from training)
- `false`: This pair is shown to models as a training example

## How It Works

### 1. Test Case Designation

When a puzzle is generated:
- The last 1-2 pairs (40% max) are automatically marked as test cases
- Test case designation is preserved through feedback iterations
- You can manually adjust which pairs are test cases later (feature to be added)

### 2. Running a Model Evaluation

Users can:
1. Navigate to a puzzle's "Model Performances" tab
2. Click "New Run" to configure a model test
3. Enter:
   - Provider (OpenAI or Anthropic)
   - Model name
   - API key
   - Temperature and max tokens
4. The system will:
   - Create a pending run
   - Execute it asynchronously
   - Show training pairs to the model
   - Ask the model to predict outputs for test cases
   - Compare predictions with actual outputs
   - Calculate accuracy and store detailed results

### 3. Viewing Results

For each run, you can see:
- Overall accuracy percentage
- Token usage and time taken
- The model's reasoning about the pattern
- Detailed breakdown of each test case:
  - Input grid
  - Model's predicted output
  - Expected output
  - Whether it was correct

## API Endpoints

### `POST /api/generations/:id/runs`
Create a new model run for a generation.

**Body:**
```json
{
  "modelName": "claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "apiKey": "sk-...",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

### `GET /api/generations/:id/runs`
Get all model runs for a generation.

### `POST /api/runs/:id/execute`
Execute a pending model run.

**Body:**
```json
{
  "apiKey": "sk-..."
}
```

### `GET /api/runs/:id`
Get detailed results for a specific run.

## UI Components

### PuzzleReviewTab
Shows the puzzle with:
- Training examples (for models to learn from)
- Test cases (highlighted in purple, used for evaluation)
- Agent's reasoning trace for creating the puzzle

### ModelPerformancesTab
Shows:
- List of all model evaluation runs
- Status of each run (pending, running, completed, failed)
- Quick metrics (accuracy, tokens, time)
- Detailed view when clicking on a run:
  - Full reasoning
  - Grid-by-grid comparison of predictions vs. expected outputs

## Extensibility

The design is built for future growth:

### Easy Schema Changes
- `metadata` JSON field in `ModelRun` allows adding new configuration without migrations
- `isTestCase` can be expanded to support different test modes (e.g., difficulty levels)

### Adding New Providers
Simply add a new provider function in `/src/lib/modelRunner.ts`:
```typescript
async function callNewProvider(apiKey, model, prompt, metadata) {
  // Your implementation
  return { reasoning, predictions, tokensUsed };
}
```

### Railway Optimization
- Normalized schema minimizes data duplication
- Indexes on frequently queried fields (`generationId`, `modelName`, `createdAt`)
- `onDelete: Cascade` ensures orphaned records are cleaned up
- JSON fields avoid excessive table joins

## Future Enhancements

1. **Manual Test Case Selection**: UI to toggle which pairs are test cases
2. **Batch Testing**: Run multiple models on a puzzle simultaneously
3. **Leaderboard**: Compare model performance across all puzzles
4. **Export Results**: Download evaluation results as JSON/CSV
5. **Cost Tracking**: Calculate API costs per run
6. **Custom Prompts**: Allow users to customize the evaluation prompt
7. **Difficulty Rating**: Auto-calculate puzzle difficulty based on model performance

## Example Usage

```typescript
// Create a run
const response = await fetch('/api/generations/abc123/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelName: 'gpt-4-turbo',
    provider: 'openai',
    apiKey: 'sk-...',
    temperature: 0.5,
    maxTokens: 3000
  })
});

const run = await response.json();

// Execute it
await fetch(`/api/runs/${run.id}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'sk-...' })
});

// Poll for results
const interval = setInterval(async () => {
  const result = await fetch(`/api/runs/${run.id}`).then(r => r.json());
  if (result.status === 'completed') {
    console.log(`Accuracy: ${result.accuracy * 100}%`);
    clearInterval(interval);
  }
}, 2000);
```
