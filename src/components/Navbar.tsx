'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, List, Settings, Cpu, Briefcase } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { detectProvider } from '@/lib/llm';

export default function Navbar() {
  const pathname = usePathname();
  const { apiKey, setApiKey } = useSettings();
  const provider = detectProvider(apiKey);

  return (
    <nav className="border-b bg-white dark:bg-gray-950 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl tracking-tighter">
          ARC Agent
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/new" 
            className={`flex items-center gap-1 text-sm font-medium ${pathname === '/new' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <PlusCircle size={16} /> New Puzzle
          </Link>
          <Link 
            href="/history" 
            className={`flex items-center gap-1 text-sm font-medium ${pathname === '/history' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <List size={16} /> History
          </Link>
          <Link 
            href="/jobs" 
            className={`flex items-center gap-1 text-sm font-medium ${pathname === '/jobs' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Briefcase size={16} /> Jobs
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {apiKey && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-bold uppercase text-gray-500">
            <Cpu size={10} /> {provider}
          </div>
        )}
        <Settings size={16} className="text-gray-400" />
        <input 
          type="password"
          placeholder="LLM API Key (OpenAI, Anthropic, Groq, Gemini)"
          className="text-xs border rounded px-2 py-1 w-64"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
    </nav>
  );
}
