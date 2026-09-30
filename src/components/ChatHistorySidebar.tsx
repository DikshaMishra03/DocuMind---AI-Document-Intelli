import React from 'react';
import { MessageSquare, Trash2, Clock, Plus, Loader2 } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistorySidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onNewChat: () => void;
  isLoading: boolean;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  isLoading,
}) => {
  return (
    <aside className="w-full h-full flex flex-col bg-slate-900/60 border-l border-slate-800 text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Chat History
          </h2>
        </div>

        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {chats.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Clock className="w-7 h-7 stroke-1 mb-2 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No past conversations</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[180px]">
              Questions you ask will appear here with saved history and citations.
            </p>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-slate-800 border-indigo-500/60 text-white shadow-sm'
                    : 'bg-slate-850/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium truncate leading-tight">
                      {chat.title || 'Conversation'}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1.5">
                      <span>{chat.message_count ?? 0} msgs</span>
                      <span>•</span>
                      <span>
                        {new Date(chat.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this conversation?')) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
