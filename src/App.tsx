import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentSidebar } from './components/DocumentSidebar';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { ArchitectureModal } from './components/ArchitectureModal';
import { api } from './services/api';
import {
  DocumentItem,
  ChatSession,
  ChatMessage,
  HealthStatus
} from './types';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'generating' | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // View States
  const [activeView, setActiveView] = useState<'chat' | 'documents' | 'architecture'>('chat');
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);

  // Fetch initial data
  const refreshData = useCallback(async () => {
    try {
      const [healthData, docsData, chatsData] = await Promise.allSettled([
        api.getHealth(),
        api.getDocuments(),
        api.getChats(),
      ]);

      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (docsData.status === 'fulfilled') setDocuments(docsData.value);
      if (chatsData.status === 'fulfilled') setChats(chatsData.value);
    } catch (err) {
      console.error('Initial load error:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle Document Upload
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatusMessage('Processing document...');
    setGlobalError(null);

    try {
      const result = await api.uploadDocument(file);
      setUploadStatusMessage('Document ready');

      // Refresh documents and health statistics
      const [newDocs, newHealth] = await Promise.all([
        api.getDocuments(),
        api.getHealth(),
      ]);
      setDocuments(newDocs);
      setHealth(newHealth);

      setTimeout(() => {
        setIsUploading(false);
        setUploadStatusMessage('');
      }, 1500);
    } catch (err) {
      setIsUploading(false);
      setUploadStatusMessage('');
      setGlobalError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  // Handle Document Deletion
  const handleDeleteDocument = async (docId: string) => {
    setGlobalError(null);
    try {
      await api.deleteDocument(docId);
      const [newDocs, newHealth] = await Promise.all([
        api.getDocuments(),
        api.getHealth(),
      ]);
      setDocuments(newDocs);
      setHealth(newHealth);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  // Handle Select Chat Session
  const handleSelectChat = async (chatId: string) => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const chatData = await api.getChat(chatId);
      setActiveChatId(chatData.id);
      setCurrentMessages(chatData.messages || []);
      setActiveView('chat');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Chat Session
  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setCurrentMessages([]);
      }
      const updatedChats = await api.getChats();
      setChats(updatedChats);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  // Handle New Chat
  const handleNewChat = () => {
    setActiveChatId(null);
    setCurrentMessages([]);
    setActiveView('chat');
    setGlobalError(null);
  };

  // Handle Sending a Question to the RAG Pipeline
  const handleSendMessage = async (question: string, topK: number) => {
    if (!question.trim()) return;

    setGlobalError(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      chat_id: activeChatId || 'temp',
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };

    setCurrentMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);
    setLoadingStage('searching');

    // Visual transition from search to generation
    const timer = setTimeout(() => {
      setLoadingStage('generating');
    }, 700);

    try {
      const response = await api.askQuestion({
        question,
        chat_id: activeChatId,
        top_k: topK,
      });

      clearTimeout(timer);

      // Create assistant message
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        chat_id: response.chat_id,
        role: 'assistant',
        content: response.answer,
        created_at: new Date().toISOString(),
        sources: response.sources,
      };

      setCurrentMessages((prev) => [...prev, assistantMsg]);
      setActiveChatId(response.chat_id);

      // Refresh chat list to update titles and message counts
      const updatedChats = await api.getChats();
      setChats(updatedChats);
    } catch (err) {
      clearTimeout(timer);
      const errMsg = err instanceof Error ? err.message : 'Failed to process question';
      setGlobalError(errMsg);

      // Append assistant error explanation
      const errorAssistantMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        chat_id: activeChatId || 'temp',
        role: 'assistant',
        content: `Error: ${errMsg}. Please verify that documents are uploaded and GEMINI_API_KEY is configured.`,
        created_at: new Date().toISOString(),
      };
      setCurrentMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStage(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        health={health}
        onNewChat={handleNewChat}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        documentCount={documents.length}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-rose-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Document Sidebar (280px on desktop) */}
        <div
          className={`w-full md:w-80 shrink-0 h-full ${
            activeView === 'documents' ? 'block' : 'hidden md:block'
          }`}
        >
          <DocumentSidebar
            documents={documents}
            onUpload={handleUpload}
            onDelete={handleDeleteDocument}
            isUploading={isUploading}
            uploadStatusMessage={uploadStatusMessage}
          />
        </div>

        {/* Center Column: Chat & QA Assistant */}
        <main
          className={`flex-1 flex flex-col h-full bg-slate-900/30 ${
            activeView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ChatArea
            messages={currentMessages}
            isLoading={isLoading}
            loadingStage={loadingStage}
            hasDocuments={documents.length > 0}
            onSelectPrompt={(p) => handleSendMessage(p, 5)}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            hasDocuments={documents.length > 0}
          />
        </main>

        {/* Right Column: Chat History (260px on desktop) */}
        <div className="hidden lg:block w-72 shrink-0 h-full">
          <ChatHistorySidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onNewChat={handleNewChat}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Architecture & RAG Explanations Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen || activeView === 'architecture'}
        onClose={() => {
          setIsArchitectureOpen(false);
          if (activeView === 'architecture') setActiveView('chat');
        }}
        health={health}
      />
    </div>
  );
}
