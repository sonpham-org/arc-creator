# ARC Agent Creator - Implementation Summary

This project is a Next.js application designed to facilitate the creation of ARC-style puzzles via an AI agent.

## Status: Production Deployed

- Scaffolding: Next.js 16 (App Router), TypeScript, Tailwind CSS
- Database: Prisma 6 with PostgreSQL on Railway (pg adapter for direct connections)
- Components: ARC Grid visualization (0-9 coloring), Puzzle Pair management with resizing
- Features: Model Performance Testing, Bulk Generation System, Content-Based Puzzle IDs
- Admin Auth: SHA-256 based admin key system for protected endpoints
- Deployment: Railway (Node 20.11.0)

## Critical Rules

### DEPLOYMENT: Test Locally Before Pushing
**ALWAYS run `npm run build` locally before pushing to Railway.**
See [docs/DEPLOYMENT_RULES.md](../docs/DEPLOYMENT_RULES.md) for full checklist.

```bash
rm -rf .next && npm run build  # Must pass before pushing
```

### Tech Stack Constraints
- Node 20.11.0 (specified in `.node-version`)
- Prisma 6.x (compatible with Node 20)
- Next.js 16.x (requires Node 20+)

## Project Structure

- `/docs` - All documentation (DEPLOYMENT_RULES, FEATURES, ARCHITECTURE, etc.)
- `/local` - Python scripts for bulk generation (Gemini + admin key auth)
- `/src/app/api` - API routes (puzzles, jobs, runs, generations)
- `/src/lib` - Core logic (llm.ts, modelRunner.ts, adminAuth.ts, puzzleId.ts)
- `/prisma` - Database schema (Prisma 6 format with `url` in schema)

## Checklist
- [x] Verify copilot-instructions.md creation
- [x] Clarify Project Requirements & Scaffold project
- [x] Customize the Project (ARC logic, UI, Agent)
- [x] Install Required Extensions
- [x] Compile and Test the Project
- [x] Ensure Documentation is Complete
