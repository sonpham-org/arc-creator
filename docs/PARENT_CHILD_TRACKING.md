# Parent-Child Puzzle Tracking

## Overview

The ARC Creator platform maintains a complete history graph of puzzle refinements through the parent-child relationship system.

## How It Works

### Database Schema

The `Generation` model tracks the refinement history:

```prisma
model Generation {
  id          String   @id @default(cuid())
  puzzleId    String
  puzzle      Puzzle   @relation(fields: [puzzleId], references: [id])
  
  parentGenId String?
  parentGen   Generation? @relation("History", fields: [parentGenId], references: [id])
  children    Generation[] @relation("History")
  
  pairs       Pair[]
  feedback    Feedback?
  // ... other fields
}
```

### Relationships

1. **Original Generations (OG)**
   - `parentGenId: null`
   - Created from:
     - AI-generated puzzles
     - Imported ARC dataset puzzles
     - Direct user creation

2. **Child Generations**
   - `parentGenId: <parent-generation-id>`
   - Created from user feedback + AI refinement
   - Links back to the generation it refines

3. **Feedback Link**
   - Each generation can have associated `Feedback`
   - Feedback includes:
     - `text`: Verbal feedback from user
     - `gridEdits`: User's manual grid corrections
   - Feedback is preserved even after new generation is created

## Example Flow

```
┌─────────────────────────────────────────────────────────────┐
│ ARC Official Puzzle (arc-2024-training/007bbfb7)           │
│ parentGenId: null                                            │
│ source: "arc-2024-training"                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ User gives feedback:
                          │ "Make the rotation 45° instead of 90°"
                          │ + Edits grid manually
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Generation 2 (Refinement)                                   │
│ parentGenId: <generation-1-id>                              │
│ Feedback saved to Generation 1                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ User gives more feedback:
                          │ "Colors should be inverted"
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Generation 3 (Further Refinement)                           │
│ parentGenId: <generation-2-id>                              │
│ Feedback saved to Generation 2                              │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Creating Refinements

**POST** `/api/puzzles/[id]/feedback`

```json
{
  "generationId": "current-generation-id",
  "verbalFeedback": "Make it more symmetric",
  "gridEdits": {
    "pairIndex": 0,
    "input": [[1,2,3], ...],
    "output": [[3,2,1], ...]
  },
  "apiKey": "sk-ant-...",
  "model": "claude-3-5-sonnet-latest"
}
```

**Response:**
```json
{
  "newGenerationId": "new-child-generation-id"
}
```

### Importing OG Puzzles

**POST** `/api/admin/puzzles/import`

```json
{
  "adminKey": "secret",
  "source": "arc-2024-training",
  "puzzles": {
    "puzzle_id": {
      "train": [...],
      "test": [...]
    }
  }
}
```

Creates puzzles with:
- `parentGenId: null` (OG status)
- `source: "arc-2024-training"` (provenance)

## Querying the History Graph

### Get Full History Tree

```typescript
const generations = await prisma.generation.findMany({
  where: { puzzleId },
  include: {
    parentGen: true,
    children: true,
    feedback: true,
    pairs: true,
  },
  orderBy: { createdAt: 'asc' }
});
```

### Get Ancestors (Walk Up)

```typescript
async function getAncestors(generationId: string) {
  const ancestors = [];
  let current = await prisma.generation.findUnique({
    where: { id: generationId },
    include: { parentGen: true, feedback: true }
  });
  
  while (current?.parentGen) {
    ancestors.push(current.parentGen);
    current = await prisma.generation.findUnique({
      where: { id: current.parentGenId! },
      include: { parentGen: true, feedback: true }
    });
  }
  
  return ancestors;
}
```

### Get Descendants (Walk Down)

```typescript
async function getDescendants(generationId: string) {
  const descendants = [];
  const queue = [generationId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.generation.findMany({
      where: { parentGenId: currentId },
      include: { feedback: true }
    });
    
    descendants.push(...children);
    queue.push(...children.map(c => c.id));
  }
  
  return descendants;
}
```

## Key Features

✅ **Complete History**: Every refinement is preserved  
✅ **Feedback Preservation**: User feedback linked to the generation it improves  
✅ **Grid Edits Stored**: Manual corrections saved for AI context  
✅ **OG Identification**: `parentGenId: null` marks original puzzles  
✅ **Source Tracking**: Official ARC puzzles marked with dataset source  
✅ **Branching Support**: Multiple children from same parent (future feature)  

## Best Practices

1. **Always Save Feedback First**: Before creating child generation
2. **Preserve Test Case Count**: Maintain same number of test pairs
3. **Include Context**: Pass parent pairs + feedback to AI
4. **Track Provenance**: Use `source` field for official puzzles
5. **Null Check Parents**: OG puzzles have `parentGenId: null`
