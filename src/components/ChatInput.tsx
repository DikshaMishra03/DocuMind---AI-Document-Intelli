import React, { useState, useRef, useEffect } from 'react';
import { Send, SlidersHorizontal, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (question: string, topK: number) => Promise<void>;
  isLoading: boolean;
  hasDocuments: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  hasDocuments,
}) => {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(5);
  const [showConfig, setShowConfig] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQ = question.trim();
    if (!cleanQ || isLoading) return;

    setQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(cleanQ, topK);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    // Auto-grow textarea height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sticky bottom-0 z-20">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end bg-slate-850 border border-slate-700/80 rounded-2xl shadow-xl focus-within:border-indigo-500 transition-all p-1.5"
        >
          {/* Top-K Selector Toggle */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl text-xs transition-colors shrink-0 ${
              showConfig || topK !== 5
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Configure RAG Retrieval (Top-K)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              hasDocuments
                ? 'Ask a question about the uploaded documents... (Enter to send)'
                : 'Upload a PDF document first, then ask questions here...'
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px] leading-relaxed"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
            title="Send Question"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* Top-K Configuration Drawer */}
        {showConfig && (
          <div className="bg-slate-850 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">Retrieval Top-K:</span>
              <span className="text-slate-400 text-[11px]">
                Number of most relevant chunks retrieved from FAISS index
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {[3, 5, 8, 10].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTopK(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    topK === k
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  k={k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
