export interface DocumentItem {
  id: string;
  filename: string;
  page_count: number;
  status: 'processing' | 'ready' | 'error';
  error_message?: string | null;
  file_size: number;
  upload_time: string;
}

export interface SourceCitation {
  id: string;
  document_id?: string | null;
  document_name: string;
  page_number: number;
  chunk_id: string;
  chunk_snippet?: string | null;
  score?: number | null;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  sources?: SourceCitation[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  message_count?: number;
  messages?: ChatMessage[];
}

export interface ChatQueryResponse {
  chat_id: string;
  question: string;
  answer: string;
  sources: SourceCitation[];
  retrieved_count: number;
  model_used: string;
}

export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
  database: string;
  database_type: string;
  vector_store: {
    total_vectors?: number;
    total_metadata_chunks?: number;
    dimension?: number;
  };
  gemini_api_configured: boolean;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
}
