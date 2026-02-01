# Evaluation API - Admin Commands

All endpoints require your `ADMIN_KEY` for authentication.

## Smart Enqueue

Analyzes all puzzles, finds what's missing, and queues evaluations intelligently.
- Priority 1: cheap/fast models first (Groq 8B, Groq 70B, Gemini Flash)
- Priority 2: expensive models only for puzzles where all cheap models scored 0%

```bash
curl -X POST http://localhost:3000/api/admin/evaluation/smart-enqueue \
  -H 'Content-Type: application/json' \
  -d '{"adminKey":"YOUR_ADMIN_KEY", "maxToQueue": 500}'
```

## Process Batch

Processes queued jobs respecting per-provider rate limits. Call repeatedly (or via cron) to drain the queue.

```bash
curl -X POST http://localhost:3000/api/admin/evaluation/process \
  -H 'Content-Type: application/json' \
  -d '{"adminKey":"YOUR_ADMIN_KEY", "batchSize": 20}'
```

## Simple Enqueue

Bulk enqueue all puzzle+model combos (less smart, queues everything).

```bash
# All providers
curl -X POST http://localhost:3000/api/admin/evaluation/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"adminKey":"YOUR_ADMIN_KEY"}'

# Specific providers only
curl -X POST http://localhost:3000/api/admin/evaluation/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"adminKey":"YOUR_ADMIN_KEY", "providers": ["groq", "gemini"]}'

# Only priority 1 (cheap models)
curl -X POST http://localhost:3000/api/admin/evaluation/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"adminKey":"YOUR_ADMIN_KEY", "priority": 1}'
```

## Check Status

View queue stats, provider breakdown, and rate limit status.

```bash
curl "http://localhost:3000/api/admin/evaluation/status?adminKey=YOUR_ADMIN_KEY"
```

## Production URLs

Replace `http://localhost:3000` with your Railway URL for production use.

## Environment Variables Required

```
GEMINI_API_KEY=       # Google AI Studio (free)
GROQ_API_KEY=         # Groq Cloud (free)
MISTRAL_API_KEY=      # Mistral La Plateforme (free Experiment plan)
CEREBRAS_API_KEY=     # Cerebras Inference (free)
OPENROUTER_API_KEY=   # OpenRouter (free tier)
```
