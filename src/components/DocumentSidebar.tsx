import React, { useRef, useState } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentSidebarProps {
  documents: DocumentItem[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUploading: boolean;
  uploadStatusMessage: string;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  documents,
  onUpload,
  onDelete,
  isUploading,
  uploadStatusMessage,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await onUpload(file);
      } else {
        alert('Please upload a valid PDF document (.pdf).');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await onUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteClick = async (docId: string, filename: string) => {
    if (confirm(`Remove "${filename}" and its vector embeddings?`)) {
      setDeletingId(docId);
      try {
        await onDelete(docId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-full h-full flex flex-col bg-slate-900/60 border-r border-slate-800 text-slate-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Documents
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {documents.length}
          </span>
        </div>

        {/* Upload Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-850/50 hover:bg-slate-800/50'
          } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="py-2 flex flex-col items-center space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-xs font-medium text-indigo-300 animate-pulse">
                {uploadStatusMessage || 'Processing document...'}
              </p>
              <span className="text-[10px] text-slate-400">
                Extracting pages & generating FAISS embeddings
              </span>
            </div>
          ) : (
            <div className="py-1 flex flex-col items-center space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-slate-200">
                <span className="text-indigo-400">Click to upload</span> or drag PDF
              </p>
              <p className="text-[10px] text-slate-400">
                PDF text extraction with PyPDF
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {documents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <FileText className="w-8 h-8 stroke-1 mb-2 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No documents uploaded</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Upload PDFs above to enable semantic similarity search and RAG answers.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isDeleting = deletingId === doc.id;
            return (
              <div
                key={doc.id}
                className="group relative bg-slate-850/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 transition-all"
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-medium text-slate-200 truncate"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </h4>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                        <span>{doc.page_count} pages</span>
                        <span>•</span>
                        <span>{formatBytes(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteClick(doc.id, doc.filename)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all shrink-0"
                    title="Delete document and remove embeddings"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Status indicator */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    {doc.status === 'ready' && (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Document ready</span>
                      </>
                    )}
                    {doc.status === 'processing' && (
                      <>
                        <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                        <span className="text-amber-400 font-medium">Processing document...</span>
                      </>
                    )}
                    {doc.status === 'error' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        <span className="text-rose-400 font-medium">Processing error</span>
                      </>
                    )}
                  </div>

                  <span className="text-slate-500 font-mono">
                    {new Date(doc.upload_time).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {doc.error_message && (
                  <p className="mt-1 text-[10px] text-rose-300 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                    {doc.error_message}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>FAISS Vectorized</span>
        </span>
        <span className="text-slate-500">Chunk: 1000ch</span>
      </div>
    </aside>
  );
};
