import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  User,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  Brain,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { ChatMessage, SourceCitation } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingStage: 'searching' | 'generating' | null;
  hasDocuments: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  loadingStage,
  hasDocuments,
  onSelectPrompt,
}) => {
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSource = (sourceKey: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [sourceKey]: !prev[sourceKey],
    }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
      {messages.length === 0 ? (
        <div className="max-w-2xl mx-auto my-auto py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-indigo-600/30 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
            <Sparkles className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Ask Questions About Your Documents
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
            DocuMind uses semantic vector search and Google Gemini to extract accurate,
            grounded answers with verifiable source document and page citations.
          </p>

          {!hasDocuments ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300 max-w-md mx-auto flex items-start space-x-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">No Documents Uploaded Yet</p>
                <p className="text-amber-300/80 mt-0.5">
                  Upload a PDF using the left sidebar to enable semantic search and document retrieval.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Suggested Prompts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {[
                  'What are the main topics discussed in this document?',
                  'Summarize the core conclusions and recommendations.',
                  'What specific data or metrics are presented?',
                  'Explain the methodology described in the document.',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectPrompt(prompt)}
                    className="p-3 rounded-xl bg-slate-850/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start space-x-2 group"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3.5 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md ${
                    isUser
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500'
                      : 'bg-slate-800 border border-slate-700 text-cyan-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div
                  className={`min-w-0 max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-850 border border-slate-800 text-slate-200 shadow-md'
                  }`}
                >
                  {/* Header / Timestamp */}
                  <div className="flex items-center justify-between space-x-4 mb-1.5 text-[11px] opacity-70">
                    <span className="font-semibold uppercase tracking-wider">
                      {isUser ? 'You' : 'DocuMind RAG'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!isUser && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-white transition-colors"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="font-sans text-slate-100 text-sm leading-relaxed overflow-hidden">
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => (
                            <strong className="font-bold text-white tracking-wide">{children}</strong>
                          ),
                          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
                          h1: ({ children }) => (
                            <h1 className="text-base font-bold text-white mt-3 mb-2 flex items-center gap-1.5">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-sm font-bold text-indigo-200 mt-2.5 mb-1.5 flex items-center gap-1.5">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-4 mb-2.5 space-y-1 text-slate-200">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-4 mb-2.5 space-y-1 text-slate-200">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
                          code: ({ className, children, ...props }) => {
                            const isInline = !className && typeof children === 'string' && !children.includes('\n');
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 rounded bg-slate-900/90 text-indigo-300 font-mono text-xs border border-slate-700/80">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="my-2 rounded-lg bg-slate-900 border border-slate-700/70 p-2.5 overflow-x-auto font-mono text-xs text-slate-200">
                                <code {...props}>{children}</code>
                              </div>
                            );
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 italic text-slate-300">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }) => (
                            <div className="my-2.5 overflow-x-auto rounded border border-slate-700/70">
                              <table className="w-full text-xs text-left border-collapse">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="bg-slate-900 px-3 py-1.5 border-b border-slate-700 font-semibold text-slate-200">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-1.5 border-b border-slate-800 text-slate-300">{children}</td>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Sources Section */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-700/60">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Sources Used ({msg.sources.length}):</span>
                      </div>

                      <div className="space-y-1.5">
                        {msg.sources.map((src, sIdx) => {
                          const srcKey = `${msg.id}_${sIdx}`;
                          const isExpanded = !!expandedSources[srcKey];

                          return (
                            <div
                              key={srcKey}
                              className="rounded-lg bg-slate-900/80 border border-slate-800 text-xs overflow-hidden"
                            >
                              <button
                                onClick={() => toggleSource(srcKey)}
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/60 transition-colors text-left"
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="font-mono text-indigo-400 font-semibold">
                                    {sIdx + 1}.
                                  </span>
                                  <span className="font-medium text-slate-200 truncate">
                                    {src.document_name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                                    Page {src.page_number}
                                  </span>
                                  {src.score !== undefined && src.score !== null && (
                                    <span className="text-[10px] text-cyan-400 font-mono">
                                      sim: {src.score}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 hover:text-white shrink-0 ml-2">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              </button>

                              {isExpanded && src.chunk_snippet && (
                                <div className="px-3 pb-2.5 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80 bg-slate-950/40 font-mono leading-relaxed">
                                  {src.chunk_snippet}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Multi-Stage Loading Feedback Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 shadow-md flex items-center space-x-3">
                {loadingStage === 'searching' ? (
                  <>
                    <Search className="w-4 h-4 text-indigo-400 animate-spin" />
                    <div>
                      <p className="font-medium text-indigo-300">Searching documents...</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Computing query embedding & querying FAISS index
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <div>
                      <p className="font-medium text-cyan-300">Generating answer...</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Sending retrieved context to Google Gemini
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
