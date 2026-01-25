# ARC Agent Creator

An AI-powered platform to design ARC (Abstraction and Reasoning Corpus) style challenge puzzles based on abstract concepts.

## Features
- **AI Agent Iteration**: Input any concept (physics, symmetry, logic) and let the agent generate 5 transformation pairs.
- **Human-in-the-loop**: Provide verbal feedback or directly edit the grid cells to guide the agent.
- **Branching History**: Every feedback loop creates a new version, allowing exploration of different logic branches.
- **Dynamic Grids**: Supports grids from 1x1 up to 30x30 with the standard 10-color ARC palette.
- **Railway Deployment Ready**: Configured for Railway with PostgreSQL and Prisma 7.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/arc_db"
   ```
4. Initialize the database:
   ```bash
   npx prisma db push
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

### Usage
1. Open [http://localhost:3000](http://localhost:3000).
2. Click the Settings icon in the navbar to enter your LLM API Key.
3. Start a "New Concept" and iterate with the agent.

## Implementation Details
- **Next.js 15+** (App Router)
- **Prisma 7** with PostgreSQL Driver Adapters
- **Tailwind CSS** for UI
- **Lucide React** for iconography
