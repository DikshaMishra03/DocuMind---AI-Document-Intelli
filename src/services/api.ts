import axios, { AxiosError } from 'axios';
import {
  DocumentItem,
  ChatSession,
  ChatMessage,
  ChatQueryResponse,
  HealthStatus
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 90000, // 90 seconds for RAG / embedding / LLM calls
});

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ detail?: string | { msg?: string }[] }>;
    if (err.response?.data?.detail) {
      if (typeof err.response.data.detail === 'string') {
        return err.response.data.detail;
      }
      if (Array.isArray(err.response.data.detail)) {
        return err.response.data.detail.map(d => (typeof d === 'object' ? d.msg : String(d))).join(', ');
      }
    }
    return err.message || 'Request failed';
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await apiClient.get<HealthStatus>('/api/health');
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getDocuments(): Promise<DocumentItem[]> {
    try {
      const res = await apiClient.get<DocumentItem[]>('/api/documents');
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async uploadDocument(file: File, onUploadProgress?: (progress: number) => void): Promise<{
    message: string;
    document: DocumentItem;
    total_chunks: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onUploadProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(percent);
          }
        },
      });
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/documents/${documentId}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getChats(): Promise<ChatSession[]> {
    try {
      const res = await apiClient.get<ChatSession[]>('/api/chats');
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getChat(chatId: string): Promise<ChatSession> {
    try {
      const res = await apiClient.get<ChatSession>(`/api/chats/${chatId}`);
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteChat(chatId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/chats/${chatId}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async askQuestion(params: {
    question: string;
    chat_id?: string | null;
    top_k?: number;
  }): Promise<ChatQueryResponse> {
    try {
      const res = await apiClient.post<ChatQueryResponse>('/api/chat', params);
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
