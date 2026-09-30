import React from 'react';
import {
  FileText,
  Plus,
  Database,
  Cpu,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';
import { HealthStatus } from '../types';

interface NavbarProps {
  health: HealthStatus | null;
  onNewChat: () => void;
  onOpenArchitecture: () => void;
  activeView: 'chat' | 'documents' | 'architecture';
  setActiveView: (view: 'chat' | 'documents' | 'architecture') => void;
  documentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onNewChat,
  onOpenArchitecture,
  activeView,
  setActiveView,
  documentCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                DocuMind
              </h1>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                RAG Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI-Powered Document Intelligence & Semantic Search
            </p>
          </div>
        </div>

        {/* Center: View Switcher (Desktop) */}
        <nav className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
          <button
            onClick={() => setActiveView('chat')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeView === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assistant
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeView === 'documents'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Documents</span>
            {documentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
                {documentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('architecture')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeView === 'architecture'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Architecture & RAG</span>
          </button>
        </nav>

        {/* Right: Status Badges & Action */}
        <div className="flex items-center space-x-3">
          {health && (
            <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-300">
              {/* FAISS Index status */}
              <div className="flex items-center space-x-1 bg-slate-800/70 border border-slate-700 px-2 py-1 rounded-md">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>FAISS:</span>
                <span className="text-white font-mono">
                  {health.vector_store?.total_vectors ?? 0} vecs
                </span>
              </div>

              {/* Database status */}
              <div className="flex items-center space-x-1 bg-slate-800/70 border border-slate-700 px-2 py-1 rounded-md">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="capitalize">{health.database_type}</span>
              </div>
            </div>
          )}

          <button
            onClick={onNewChat}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            title="Start New Conversation"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
};
