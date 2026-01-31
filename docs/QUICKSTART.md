# Quick Start Guide: Model Performance Testing

## Step-by-Step Tutorial

### 1️⃣ Create a Puzzle
1. Go to "New Concept" page
2. Enter your idea (e.g., "Rotate 90 degrees clockwise")
3. The AI generates 5 input-output pairs
4. **Automatically**: Last 1-2 pairs marked as test cases

### 2️⃣ Review Your Puzzle
Navigate to the puzzle detail page. You'll see two tabs:

#### 📋 Puzzle Review Tab
```
┌─────────────────────────────────────┐
│ Color Palette: ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ │
├─────────────────────────────────────┤
│ Agent Reasoning:                     │
│ "I created pairs that demonstrate    │
│  a 90° clockwise rotation..."        │
├─────────────────────────────────────┤
│ Training Examples (3)               │
│ ┌─────┐    ┌─────┐                 │
│ │█ ░ █│ → │█ █ ░│  Example 1      │
│ │░ █ ░│   │█ ░ ░│                 │
│ └─────┘    └─────┘                 │
│                                     │
│ ... more examples ...               │
├─────────────────────────────────────┤
│ 🟣 Test Cases (2) 🟣               │
│ ┌─────┐    ┌─────┐                 │
│ │░ █ ░│ → │? ? ?│  Test 1         │
│ │█ ░ █│   │? ? ?│                 │
│ └─────┘    └─────┘                 │
└─────────────────────────────────────┘
```

#### 📊 Model Performances Tab
```
┌─────────────────────────────────────┐
│ Model Performance Runs    [New Run] │
├─────────────────────────────────────┤
│ No runs yet. Click "New Run" to     │
│ evaluate a model on this puzzle.    │
└─────────────────────────────────────┘
```

### 3️⃣ Create a Model Run
Click "New Run" button:

```
┌─────────────────────────────────────┐
│ Configure New Run                    │
├─────────────────────────────────────┤
│ Provider:   [anthropic ▼]           │
│ Model:      claude-3-5-sonnet-...   │
│ API Key:    ••••••••••••••••        │
│ Temperature: 0.7                     │
│ Max Tokens:  4000                    │
│                                      │
│       [Create & Execute] ▶          │
└─────────────────────────────────────┘
```

### 4️⃣ Watch Execution
The run appears in the list with status badges:

```
┌─────────────────────────────────────┐
│ claude-3-5-sonnet-20241022  [running]│
│ 🏆 N/A  ⚡ N/A tokens  🕐 Just now   │
│                              [>]     │
└─────────────────────────────────────┘
```

After a few seconds (auto-refreshing):

```
┌─────────────────────────────────────┐
│ claude-3-5-sonnet-20241022 [completed]│
│ 🏆 100%  ⚡ 3,245 tokens  🕐 2 min ago│
│                              [>]     │
└─────────────────────────────────────┘
```

### 5️⃣ View Detailed Results
Click on the run to see full results:

```
┌─────────────────────────────────────┐
│ ← Back to runs                       │
├─────────────────────────────────────┤
│ claude-3-5-sonnet-20241022          │
├─────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┬────┤
│ │Accuracy │ Correct │ Tokens  │Time│
│ │  100%   │   2/2   │  3,245  │5.2s│
│ └─────────┴─────────┴─────────┴────┤
├─────────────────────────────────────┤
│ 🧠 Model Reasoning:                 │
│ "The pattern shows a 90-degree      │
│  clockwise rotation. Each cell at   │
│  position (r,c) moves to (c, H-1-r) │
│  where H is the height..."          │
├─────────────────────────────────────┤
│ Predictions                          │
├─────────────────────────────────────┤
│ Test Case 1              ✓ Correct  │
│ ┌──────┬──────┬──────┐             │
│ │Input │Pred. │Expect│             │
│ ├──────┼──────┼──────┤             │
│ │░ █ ░ │█ █ ░ │█ █ ░ │             │
│ │█ ░ █ │█ ░ ░ │█ ░ ░ │             │
│ └──────┴──────┴──────┘             │
├─────────────────────────────────────┤
│ Test Case 2              ✓ Correct  │
│ ┌──────┬──────┬──────┐             │
│ │Input │Pred. │Expect│             │
│ ├──────┼──────┼──────┤             │
│ │█ █ █ │█ ░ ░ │█ ░ ░ │             │
│ │░ ░ ░ │█ ░ ░ │█ ░ ░ │             │
│ │      │█ █ █ │█ █ █ │             │
│ └──────┴──────┴──────┘             │
└─────────────────────────────────────┘
```

## API Usage Example

### Creating and Executing a Run Programmatically

```javascript
// 1. Create a run
const createResponse = await fetch('/api/generations/gen_abc123/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelName: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    temperature: 0.7,
    maxTokens: 4000
  })
});

const run = await createResponse.json();
console.log(`Created run: ${run.id}`);

// 2. Execute the run
await fetch(`/api/runs/${run.id}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'sk-ant-...' })
});

console.log('Execution started...');

// 3. Poll for completion
const checkStatus = async () => {
  const response = await fetch(`/api/runs/${run.id}`);
  const data = await response.json();
  
  console.log(`Status: ${data.status}`);
  
  if (data.status === 'completed') {
    console.log(`Accuracy: ${(data.accuracy * 100).toFixed(1)}%`);
    console.log(`Correct: ${data.correctCount}/${data.totalCount}`);
    console.log(`Tokens: ${data.tokensUsed}`);
    console.log(`Time: ${data.timeTakenMs}ms`);
    
    data.predictions.forEach((pred, i) => {
      console.log(`Test ${i + 1}: ${pred.isCorrect ? '✓' : '✗'}`);
    });
  } else if (data.status === 'failed') {
    console.error(`Error: ${data.errorMessage}`);
  } else {
    // Still running, check again in 2 seconds
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

## Common Use Cases

### 1. Compare Multiple Models
```javascript
const models = [
  { name: 'gpt-4-turbo', provider: 'openai' },
  { name: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  { name: 'gpt-3.5-turbo', provider: 'openai' }
];

for (const model of models) {
  // Create and execute run for each model
  // Compare results
}
```

### 2. Test Different Temperatures
```javascript
const temperatures = [0.3, 0.7, 1.0];

for (const temp of temperatures) {
  // Create run with different temperature
  // See how it affects performance
}
```

### 3. Find Difficult Puzzles
```javascript
// Run all models on a puzzle
// If accuracy < 50% for all models, it's difficult
// Use for research or challenge creation
```

## Tips & Best Practices

### ✅ Do's
- Use test cases to evaluate true understanding, not memorization
- Try multiple models to compare reasoning approaches
- Review model reasoning even when predictions are correct
- Iterate on puzzles that models fail consistently

### ❌ Don'ts
- Don't make all pairs test cases (models need training examples)
- Don't reuse the same API key in production (use environment variables)
- Don't run too many evaluations simultaneously (can be expensive)
- Don't ignore failed runs (check error messages for insights)

## Troubleshooting

### Run Status: Failed
**Check:**
- API key is valid
- Model name is correct (e.g., `claude-3-5-sonnet-20241022` not `claude-3.5`)
- Provider matches the API key
- Error message in the failed run details

### Accuracy is 0%
**Possible Causes:**
- Model misunderstood the pattern
- Grids are too complex
- Not enough training examples
- Pattern is ambiguous

**Solutions:**
- Add more training pairs
- Simplify the pattern
- Add verbal feedback to clarify the concept
- Try a more capable model

### Run is Stuck in "Running"
**Wait:** Model calls can take 5-30 seconds
**Check:** Browser console for errors
**Refresh:** Page to see latest status

## Database Queries

### Get All Runs for a Puzzle
```sql
SELECT * FROM "ModelRun" 
WHERE "generationId" = 'gen_xyz'
ORDER BY "createdAt" DESC;
```

### Find Best Performing Model
```sql
SELECT "modelName", AVG("accuracy") as avg_accuracy
FROM "ModelRun"
WHERE "status" = 'completed'
GROUP BY "modelName"
ORDER BY avg_accuracy DESC;
```

### Get Hardest Puzzles
```sql
SELECT g."puzzleId", AVG(mr."accuracy") as avg_accuracy
FROM "ModelRun" mr
JOIN "Generation" g ON mr."generationId" = g.id
WHERE mr."status" = 'completed'
GROUP BY g."puzzleId"
ORDER BY avg_accuracy ASC
LIMIT 10;
```

---

**Ready to test your puzzles?** Start creating runs and see how different AI models stack up! 🚀
