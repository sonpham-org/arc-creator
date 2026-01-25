import Link from "next/link";
import { PlusCircle, List } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          ARC Agent Creator
        </h1>
        <p className="text-xl text-gray-500">
          Transform any abstract concept into a set of 2D logic puzzles. 
          The agent designs, you refine. Collaboration at the speed of thought.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Link 
          href="/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105"
        >
          <PlusCircle size={24} /> New Concept
        </Link>
        <Link 
          href="/history"
          className="flex items-center gap-2 bg-gray-100 text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all hover:scale-105 dark:bg-gray-800 dark:text-white"
        >
          <List size={24} /> Library
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl">
        <div className="p-6 border rounded-2xl space-y-2">
          <h3 className="font-bold">Abstract Reasoning</h3>
          <p className="text-sm text-gray-500">Agent interprets concepts like "symmetry" or "gravity" into grid transformations.</p>
        </div>
        <div className="p-6 border rounded-2xl space-y-2">
          <h3 className="font-bold">Branching History</h3>
          <p className="text-sm text-gray-500">Every feedback loop creates a new branch, allowing you to explore multiple directions.</p>
        </div>
        <div className="p-6 border rounded-2xl space-y-2">
          <h3 className="font-bold">Human-in-the-loop</h3>
          <p className="text-sm text-gray-500">Directly edit grid cells to correct the agent's logic and guide the next generation.</p>
        </div>
      </div>
    </div>
  );
}
