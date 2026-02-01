# Free LLM Evaluation Strategy

## Goal

Populate the Model Performances tab for every puzzle using free LLM APIs. Zero or near-zero cost.

## Available Free Providers

### Tier 1: High Volume (1,000+ puzzles/day each)

| Provider | Best Model | Daily Free Capacity | JSON Mode |
|---|---|---|---|
| **Google Gemini** (Flash-Lite) | gemini-2.5-flash-lite | ~1,000 RPD | Yes (strict schema) |
| **Google Gemini** (Flash) | gemini-2.5-flash | ~250 RPD | Yes |
| **Google Gemini** (Pro) | gemini-2.5-pro | ~25-100 RPD | Yes |
| **Groq** | llama-3.3-70b-versatile | ~14,400 RPD (30 RPM) | Yes |
| **SambaNova** | llama-3.1-405b | ~14,400 RPD (10 RPM) | Yes |
| **Mistral** | mistral-large | ~500+ RPD | Yes |

### Tier 2: Moderate Volume

| Provider | Best Model | Daily Free Capacity | JSON Mode |
|---|---|---|---|
| **Cerebras** | qwen3-235b-instruct | ~800 puzzles/day (1M tok) | Yes |
| **OpenRouter** (w/ $10 deposit) | deepseek-r1:free, llama-3.3-70b:free | ~1,000 RPD | Varies |
| **Cloudflare Workers AI** | llama-3-8b, mistral-7b | 10,000 neurons/day | Model-dependent |

### Tier 3: Low Volume (Testing/Prototyping)

| Provider | Best Model | Daily Free Capacity |
|---|---|---|
| **GitHub Models** | gpt-4o | 50 RPD |
| **NVIDIA NIM** | nemotron-3-nano-30b | Prototyping only |
| **Scaleway** | deepseek-r1-distill-llama-70b | 1M tokens (one-time) |

### Estimated Combined Daily Throughput: ~4,000-5,000 puzzle evaluations/day

## Token Budget Per Puzzle

An ARC puzzle evaluation requires roughly:

| Component | Tokens |
|---|---|
| System prompt | ~200 |
| Training pairs (3 examples) | ~800 |
| Test input grid | ~200 |
| Output format instruction | ~50 |
| **Total input** | **~1,250** |
| Model output (grid + reasoning) | ~500 |
| **Total per puzzle** | **~1,750** |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL (Railway)                                    │
│                                                         │
│  evaluation_queue table:                                │
│  ┌──────────┬──────────┬──────────┬─────────┬────────┐ │
│  │ puzzle_id│ provider │ model    │ status  │ result │  │
│  └──────────┴──────────┴──────────┴─────────┴────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │  Worker Process       │
         │  (Node.js on Railway) │
         │                       │
         │  - Polls queue        │
         │  - Per-provider rate  │
         │    limiter            │
         │  - Exponential        │
         │    backoff on 429     │
         │  - Provider rotation  │
         └───┬───┬───┬───┬──────┘
             │   │   │   │
        Gemini Groq SN  Mistral  ... (parallel providers)
```

## Implementation Plan

### Step 1: Unified Provider Interface

Use the existing `/api/runs/[id]/execute` pattern but add support for free providers. Each provider needs:
- API key management (env vars for free tier keys)
- Rate limit tracking (in-memory token bucket per provider)
- Response parsing (extract output grid from model response)

### Step 2: Queue-Based Worker

A background worker that:
1. Picks the next unevaluated puzzle+model combination from the queue
2. Checks rate limits for each provider
3. Sends the puzzle to the available provider with lowest latency
4. Parses the response and stores the result
5. Backs off on 429 errors, rotates to next provider

### Step 3: Cron-Based Scheduling

Instead of an always-on worker (which costs Railway compute hours), use a cron job:
- Run every 15-30 minutes
- Process a batch of puzzles within rate limits
- Sleep until next invocation
- Railway supports cron services natively

### Step 4: Smart Batching (Two-Pass)

1. **First pass**: Use cheap/fast models (Gemini Flash-Lite, Groq Llama 8B) on all puzzles
2. **Second pass**: Use powerful models (Gemini Pro, SambaNova Llama 405B) only on puzzles the cheap models failed
3. Never re-evaluate a puzzle+model combination that already has a result

## Prompt Template

```
You are solving an ARC (Abstraction and Reasoning Corpus) puzzle.

Given training examples showing input-output grid transformations, determine the pattern and apply it to the test input.

Grid values 0-9 represent colors. Grids are 2D arrays.

Training examples:
{training_pairs_json}

Test input:
{test_input_json}

Respond with ONLY a JSON object: {"output": [[...], ...]}
```

## Railway Cost Impact

- **Cron worker**: ~$0.50-1.00/month (runs a few minutes every 15-30 min)
- **Database**: Already included in existing Railway Postgres
- **API calls**: $0 (all free tiers)
- **Total additional cost**: ~$1/month

## Provider API Keys (Environment Variables)

```env
GEMINI_API_KEY=           # Google AI Studio (free)
GROQ_API_KEY=             # Groq Cloud (free)
SAMBANOVA_API_KEY=        # SambaNova Cloud (free)
MISTRAL_API_KEY=          # Mistral La Plateforme (free)
CEREBRAS_API_KEY=         # Cerebras Inference (free)
OPENROUTER_API_KEY=       # OpenRouter (free, or $10 deposit for 20x quota)
```

## Useful References

- Community-maintained free LLM list: [github.com/cheahjs/free-llm-api-resources](https://github.com/cheahjs/free-llm-api-resources)
- LiteLLM (unified interface to all providers): [docs.litellm.ai](https://docs.litellm.ai/)
- Google Gemini rate limits: [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
