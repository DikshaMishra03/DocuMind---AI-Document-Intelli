import React, { useState } from 'react';
import {
  X,
  Cpu,
  Database,
  Layers,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  Code
} from 'lucide-react';
import { HealthStatus } from '../types';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthStatus | null;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  health,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'interview' | 'tech'>('pipeline');

  if (!isOpen) return null;

  const interviewConcepts = [
    {
      q: '1. What is RAG (Retrieval-Augmented Generation)?',
      a: 'RAG combines an external information retrieval mechanism (vector database) with a generative large language model. Instead of relying solely on the LLM’s pre-trained weights, relevant domain documents are retrieved at runtime and passed as ground-truth context in the prompt, eliminating hallucinations and enabling private knowledge querying.',
    },
    {
      q: '2. What are embeddings?',
      a: 'Embeddings are dense numerical vector representations of text in a high-dimensional continuous space (e.g. 384 dimensions for all-MiniLM-L6-v2). Texts with similar semantic meaning are mapped to coordinates close to each other, allowing mathematical calculation of meaning similarity.',
    },
    {
      q: '3. What is a Transformer?',
      a: 'A Transformer is a deep learning architecture introduced by Vaswani et al. (2017) based on self-attention mechanisms. It processes all tokens in parallel and dynamically weighs the relevance of words relative to each other regardless of sentence distance.',
    },
    {
      q: '4. What is semantic search?',
      a: 'Unlike traditional lexical search (keyword matching like BM25), semantic search understands the conceptual intent and context behind a query by comparing embedding vectors using cosine similarity or inner product.',
    },
    {
      q: '5. What is FAISS (Facebook AI Similarity Search)?',
      a: 'FAISS is a specialized library developed by Meta for high-performance similarity search and clustering of dense vectors. It is optimized to search millions of vectors in milliseconds using techniques like Flat L2/IP, Inverted File (IVF), and Product Quantization (PQ).',
    },
    {
      q: '6. Why use a vector database instead of a relational database for search?',
      a: 'Relational databases index exact scalar values (B-Trees) and cannot efficiently calculate nearest-neighbors in 384+ dimensions. Vector databases are purpose-built with specialized indexing algorithms (HNSW, IVF, Flat) to perform sub-linear k-Nearest Neighbor (k-NN) queries.',
    },
    {
      q: '7. Why do we chunk documents?',
      a: 'LLMs have maximum context window limits and cost constraints. Chunking divides long documents into coherent semantic passages (e.g. 1000 characters) so that search retrieves only the relevant paragraphs rather than entire books.',
    },
    {
      q: '8. What is chunk overlap?',
      a: 'Chunk overlap (e.g. 200 characters) ensures that sentences, ideas, or references that span across the boundary of two adjacent chunks are not split or lost, maintaining context continuity during retrieval.',
    },
    {
      q: '9. What is Top-K retrieval?',
      a: 'Top-K specifies the number of highest-scoring, most similar document chunks to retrieve from the vector index for a given query (typically K=3 to 8).',
    },
    {
      q: '10. What is hallucination?',
      a: 'Hallucination occurs when an LLM generates plausibly sounding but factually incorrect or ungrounded statements because it predicts tokens based on statistical probabilities rather than verified truth.',
    },
    {
      q: '11. How does RAG reduce hallucinations?',
      a: 'RAG grounds the LLM by explicitly injecting retrieved source facts into the prompt and instructing the model: "Answer using only the provided context. If not found, state that the information is unavailable."',
    },
    {
      q: '12. Why use LangChain or modular RAG services?',
      a: 'Modular architecture separates document parsing, text chunking, embedding generation, vector storage, and prompt management into maintainable, testable, and swappable components.',
    },
    {
      q: '13. SQL database vs. Vector database in DocuMind',
      a: 'PostgreSQL/SQL stores relational metadata: documents, users, chat sessions, message records, and source citations. FAISS stores dense floating-point vector embeddings and performs nearest-neighbor vector math. Both complement each other.',
    },
    {
      q: '14. Why API keys must remain private and server-side',
      a: 'Exposing API keys in client-side bundles allows attackers to steal credentials, deplete quotas, incur financial costs, and abuse models. All LLM calls must remain secure on the backend.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                DocuMind Architecture & RAG Intelligence
              </h2>
              <p className="text-xs text-slate-400">
                End-to-End System Design, Technologies, and Generative AI Interview Guide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 pt-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`pb-3 px-4 border-b-2 transition-all ${
              activeTab === 'pipeline'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            RAG Pipeline Flow
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`pb-3 px-4 border-b-2 transition-all ${
              activeTab === 'interview'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            14 Interview Concepts
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`pb-3 px-4 border-b-2 transition-all ${
              activeTab === 'tech'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Parameters & Specs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'pipeline' && (
            <div className="space-y-6 text-sm">
              <div className="bg-slate-850 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>The Step-by-Step Retrieval-Augmented Generation Flow</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-indigo-400">1. PDF Text Extraction:</span>
                      <p className="mt-1 text-slate-400">
                        PyPDF reads documents page-by-page, preserving page numbers for citation provenance.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-indigo-400">2. Text Cleaning:</span>
                      <p className="mt-1 text-slate-400">
                        Removes unprintable characters, normalizes Unicode spaces, and trims excess whitespace.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-indigo-400">3. Semantic Chunking:</span>
                      <p className="mt-1 text-slate-400">
                        Splits text into 1,000-character windows with 200-character overlap along paragraph and sentence boundaries.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-indigo-400">4. Vector Embeddings:</span>
                      <p className="mt-1 text-slate-400">
                        Generates normalized 384-dimensional dense vectors using <code>all-MiniLM-L6-v2</code>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400">5. FAISS Indexing:</span>
                      <p className="mt-1 text-slate-400">
                        Stores embeddings in a FAISS inner-product index with persistent metadata mapping to disk.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400">6. Semantic Similarity Search:</span>
                      <p className="mt-1 text-slate-400">
                        Converts user questions into vectors and retrieves top-K nearest document chunks.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400">7. Grounded LLM Prompting:</span>
                      <p className="mt-1 text-slate-400">
                        Instructs Google Gemini to answer strictly using retrieved context, prohibiting hallucinations.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-emerald-400">8. Citations & Delivery:</span>
                      <p className="mt-1 text-slate-400">
                        Returns grounded answer with document names, page numbers, and similarity scores.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interview' && (
            <div className="space-y-4">
              {interviewConcepts.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-850 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5"
                >
                  <h4 className="font-bold text-indigo-300 text-sm">{item.q}</h4>
                  <p className="text-slate-300 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
                  Backend & Database Specifications
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Backend Framework</span>
                    <span className="font-mono text-white">FastAPI + Uvicorn</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">ORM & Database</span>
                    <span className="font-mono text-white">SQLAlchemy + PostgreSQL</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Vector Search Engine</span>
                    <span className="font-mono text-white">FAISS (IndexFlatIP)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">PDF Extraction</span>
                    <span className="font-mono text-white">PyPDF 5.x</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Unit Testing</span>
                    <span className="font-mono text-white">pytest + TestClient</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
                  Generative AI & RAG Parameters
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">LLM Provider</span>
                    <span className="font-mono text-indigo-400">Google Gemini API</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Default Model</span>
                    <span className="font-mono text-white">gemini-3.8-flash</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Embedding Model</span>
                    <span className="font-mono text-cyan-400">all-MiniLM-L6-v2</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Vector Dimensions</span>
                    <span className="font-mono text-white">384 Dimensions</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Chunk Size / Overlap</span>
                    <span className="font-mono text-white">1000 ch / 200 ch</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Default Top-K</span>
                    <span className="font-mono text-white">5 Chunks</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>DOCUMIND — AI-Powered Document Intelligence & RAG Assistant</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
