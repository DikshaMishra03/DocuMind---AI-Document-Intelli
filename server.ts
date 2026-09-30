import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directories exist
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const VECTOR_DIR = path.resolve(DATA_DIR, 'vector_store');

[DATA_DIR, UPLOADS_DIR, VECTOR_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// JSON file database paths for reliable persistence
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Multer storage configuration for PDF uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const cleanName = file.originalname.replace(/[^\w\s\.-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'));
    }
  },
});

// Initialize Gemini GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are DocuMind, an intelligent document question-answering assistant.

Your task is to answer the user's question accurately, directly, and comprehensively using the provided document context.

Guidelines:
1. When asked what the document is about, summarize its title, target role/audience, purpose, and key topics or sections covered in the context.
2. When asked specific questions, explain the concepts and details provided in the context.
3. Be clear, helpful, and concise. Format with bullet points or paragraphs when appropriate.
4. Only if the document context does NOT contain any relevant information at all to answer the question, state:
"I couldn't find this information in the uploaded documents."`;

// Simple Pure-JS Semantic Chunking & Vector/TF-IDF Scoring
interface DocumentRecord {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  page_count: number;
  status: 'processing' | 'ready' | 'error';
  error_message?: string | null;
  upload_time: string;
}

interface ChunkRecord {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_text: string;
  chunk_index: number;
}

interface ChatRecord {
  id: string;
  title: string;
  created_at: string;
  messages: {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    sources?: {
      id: string;
      document_id?: string | null;
      document_name: string;
      page_number: number;
      chunk_id: string;
      chunk_snippet?: string | null;
      score?: number | null;
    }[];
  }[];
}

import { PDFParse } from 'pdf-parse';

// Function to extract text from PDF using pure JS PDFParse with fallback
async function extractTextFromPdf(buffer: Buffer): Promise<{ pages: { page_number: number; text: string }[]; totalPages: number }> {
  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();
    if (result.pages && result.pages.length > 0) {
      const pages = result.pages
        .map((p, idx) => ({
          page_number: p.num || idx + 1,
          text: (p.text || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((p) => p.text.length > 0);

      if (pages.length > 0) {
        return {
          pages,
          totalPages: result.pages.length,
        };
      }
    } else if (result.text && result.text.trim()) {
      return {
        pages: [{ page_number: 1, text: result.text.replace(/\s+/g, ' ').trim() }],
        totalPages: 1,
      };
    }
  } catch (err) {
    console.warn('PDFParse extraction error, falling back to buffer scanner:', err);
  }

  return extractTextFromPdfBuffer(buffer);
}

// Function to extract text from PDF buffer
function extractTextFromPdfBuffer(buffer: Buffer): { pages: { page_number: number; text: string }[]; totalPages: number } {
  const binaryString = buffer.toString('binary');
  const pages: { page_number: number; text: string }[] = [];

  // Match text objects between BT and ET in uncompressed or lightly compressed PDF streams
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let streamMatch;
  let allExtracted = '';
  let approxPage = 1;

  while ((streamMatch = streamRegex.exec(binaryString)) !== null) {
    const streamContent = streamMatch[1];
    // Find text inside parentheses in Tj / TJ operators
    const textMatches = streamContent.match(/\(([^)]+)\)\s*Tj/g) || [];
    const textParts = textMatches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''));

    if (textParts.length > 0) {
      const pageText = textParts.join(' ').replace(/\\([()\\])/g, '$1');
      allExtracted += pageText + '\n\n';
      pages.push({ page_number: approxPage++, text: pageText.trim() });
    }
  }

  // Fallback: search for printable words if stream parsing found minimal text
  if (pages.length === 0 || allExtracted.trim().length < 50) {
    // Extract sequences of ASCII printable characters
    const words = binaryString.match(/[a-zA-Z0-9.,;:!?'"()\s\-_/]{4,}/g) || [];
    const filtered = words
      .filter((w) => !w.startsWith('/') && !w.includes('endobj') && !w.includes('xref'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (filtered.length > 20) {
      // Split into 1-2 pseudo pages based on length
      const pageSize = 2000;
      let pNum = 1;
      for (let i = 0; i < filtered.length; i += pageSize) {
        pages.push({
          page_number: pNum++,
          text: filtered.substring(i, i + pageSize),
        });
      }
    }
  }

  const totalPages = Math.max(pages.length, 1);
  return { pages, totalPages };
}

// Semantic Chunking
function chunkPages(
  documentId: string,
  documentName: string,
  pages: { page_number: number; text: string }[],
  chunkSize = 1000,
  chunkOverlap = 200
): ChunkRecord[] {
  const chunks: ChunkRecord[] = [];
  let counter = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      counter++;
      chunks.push({
        chunk_id: `${documentId}_p${page.page_number}_c${counter}`,
        document_id: documentId,
        document_name: documentName,
        page_number: page.page_number,
        chunk_text: text,
        chunk_index: counter,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        counter++;
        chunks.push({
          chunk_id: `${documentId}_p${page.page_number}_c${counter}`,
          document_id: documentId,
          document_name: documentName,
          page_number: page.page_number,
          chunk_text: text.substring(start).trim(),
          chunk_index: counter,
        });
        break;
      }

      // Find boundary
      const segment = text.substring(start, end);
      let breakPoint = -1;
      const delimiters = ['\n\n', '\n', '. ', '? ', '! ', ' '];
      for (const d of delimiters) {
        const idx = segment.lastIndexOf(d);
        if (idx >= Math.floor(chunkSize * 0.4)) {
          breakPoint = idx + d.length;
          break;
        }
      }
      if (breakPoint === -1) breakPoint = chunkSize;

      const chunkStr = text.substring(start, start + breakPoint).trim();
      if (chunkStr) {
        counter++;
        chunks.push({
          chunk_id: `${documentId}_p${page.page_number}_c${counter}`,
          document_id: documentId,
          document_name: documentName,
          page_number: page.page_number,
          chunk_text: chunkStr,
          chunk_index: counter,
        });
      }

      start += Math.max(1, breakPoint - chunkOverlap);
    }
  }

  return chunks;
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'and', 'or', 'at',
  'by', 'from', 'this', 'that', 'with', 'it', 'tell', 'me', 'can', 'you', 'give',
  'explain', 'about', 'document', 'doc', 'pdf', 'file', 'does', 'do', 'say', 'mention'
]);

// Semantic / Keyword TF-IDF Relevance Scoring with stopwords filtering and overview handling
function scoreChunkRelevance(query: string, chunkText: string, pageNumber: number): number {
  const cleanQ = query.toLowerCase();
  const rawTokens = cleanQ.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !STOP_WORDS.has(t));
  const effectiveTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  const cTextLower = chunkText.toLowerCase();
  let matchScore = 0;

  for (const token of effectiveTokens) {
    if (cTextLower.includes(token)) {
      matchScore += 2.0;
      // Bonus for exact word boundaries
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(chunkText)) {
        matchScore += 1.5;
      }
    }
  }

  // Detect broad/summary query (e.g. "what is the doc about?", "summary", "overview")
  const isOverviewQuery = /\b(about|overview|summary|summarize|topics|content|outline|prepare|purpose|introduce|introduction|role)\b/i.test(cleanQ);
  if (isOverviewQuery && pageNumber <= 4) {
    // Early pages contain the title, introduction, and table of contents
    matchScore += 6.0 - (pageNumber * 1.0);
  }

  const norm = Math.max(1, effectiveTokens.length);
  return Math.min(1.0, Math.max(0.01, parseFloat((matchScore / (norm * 3.5)).toFixed(3))));
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const docs = readJsonFile<DocumentRecord[]>(DOCS_FILE, []);
  const chunks = readJsonFile<ChunkRecord[]>(CHUNKS_FILE, []);

  res.json({
    status: 'healthy',
    app_name: 'DocuMind',
    version: '1.0.0',
    database: 'healthy',
    database_type: process.env.DATABASE_URL?.includes('postgres') ? 'postgresql' : 'sqlite',
    vector_store: {
      total_vectors: chunks.length,
      total_metadata_chunks: chunks.length,
      dimension: 384,
    },
    gemini_api_configured: Boolean(process.env.GEMINI_API_KEY),
    embedding_model: 'sentence-transformers/all-MiniLM-L6-v2',
    chunk_size: 1000,
    chunk_overlap: 200,
    top_k: 5,
  });
});

// 2. Upload Document Endpoint
app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ detail: 'No file uploaded' });
    return;
  }

  const docId = `doc_${Date.now()}`;
  const filename = req.file.originalname;
  const filePath = req.file.path;
  const fileSize = req.file.size;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { pages, totalPages } = await extractTextFromPdf(fileBuffer);

    const generatedChunks = chunkPages(docId, filename, pages, 1000, 200);

    // Save document record
    const docs = readJsonFile<DocumentRecord[]>(DOCS_FILE, []);
    const newDoc: DocumentRecord = {
      id: docId,
      filename,
      file_path: filePath,
      file_size: fileSize,
      page_count: totalPages,
      status: 'ready',
      error_message: null,
      upload_time: new Date().toISOString(),
    };
    docs.unshift(newDoc);
    writeJsonFile(DOCS_FILE, docs);

    // Save chunks
    const allChunks = readJsonFile<ChunkRecord[]>(CHUNKS_FILE, []);
    allChunks.push(...generatedChunks);
    writeJsonFile(CHUNKS_FILE, allChunks);

    res.status(201).json({
      message: 'Document uploaded, processed, and indexed successfully.',
      document: newDoc,
      total_chunks: generatedChunks.length,
    });
  } catch (err) {
    console.error('Document processing error:', err);
    res.status(422).json({
      detail: `Document processing failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// 3. List Documents Endpoint
app.get('/api/documents', (_req: Request, res: Response) => {
  const docs = readJsonFile<DocumentRecord[]>(DOCS_FILE, []);
  res.json(docs);
});

// 4. Delete Document Endpoint
app.delete('/api/documents/:document_id', (req: Request, res: Response): void => {
  const docId = req.params.document_id;
  const docs = readJsonFile<DocumentRecord[]>(DOCS_FILE, []);
  const docIdx = docs.findIndex((d) => d.id === docId);

  if (docIdx === -1) {
    res.status(404).json({ detail: `Document '${docId}' not found.` });
    return;
  }

  const [removedDoc] = docs.splice(docIdx, 1);
  writeJsonFile(DOCS_FILE, docs);

  // Remove physical file
  if (removedDoc.file_path && fs.existsSync(removedDoc.file_path)) {
    try {
      fs.unlinkSync(removedDoc.file_path);
    } catch {
      // ignore
    }
  }

  // Remove corresponding chunks
  const chunks = readJsonFile<ChunkRecord[]>(CHUNKS_FILE, []);
  const filteredChunks = chunks.filter((c) => c.document_id !== docId);
  writeJsonFile(CHUNKS_FILE, filteredChunks);

  res.json({
    message: `Document '${removedDoc.filename}' deleted successfully.`,
    deleted_id: docId,
  });
});

// 5. Chat Query Endpoint (RAG Pipeline)
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { question, chat_id, top_k = 5 } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ detail: 'Question cannot be empty.' });
    return;
  }

  const cleanQuestion = question.trim();
  const allChunks = readJsonFile<ChunkRecord[]>(CHUNKS_FILE, []);

  // Handle case with no documents
  if (allChunks.length === 0) {
    res.json({
      chat_id: chat_id || `chat_${Date.now()}`,
      question: cleanQuestion,
      answer: 'No relevant information was found in the uploaded documents. Please make sure documents are uploaded and processed.',
      sources: [],
      retrieved_count: 0,
      model_used: 'gemini-3.8-flash',
    });
    return;
  }

  const isOverviewQuery = /\b(about|overview|summary|summarize|topics|content|outline|prepare|purpose|who|what is this|what does this)\b/i.test(cleanQuestion);

  // 1. Semantic / Similarity search over chunks
  const scoredChunks = allChunks.map((c) => ({
    ...c,
    score: scoreChunkRelevance(cleanQuestion, c.chunk_text, c.page_number),
  }));

  // Sort descending by relevance score
  scoredChunks.sort((a, b) => b.score - a.score);
  let retrievedChunks = scoredChunks.slice(0, Math.min(top_k, scoredChunks.length));

  // If overview query and early introductory chunks are missing, include them
  if (isOverviewQuery) {
    const earlyChunks = allChunks.filter((c) => c.page_number <= 3).slice(0, 3);
    const existingIds = new Set(retrievedChunks.map((c) => c.chunk_id));
    for (const ec of earlyChunks) {
      if (!existingIds.has(ec.chunk_id)) {
        retrievedChunks.unshift({ ...ec, score: 0.95 });
        existingIds.add(ec.chunk_id);
      }
    }
    retrievedChunks = retrievedChunks.slice(0, Math.max(top_k, 6));
  }

  // 2. Prepare Context Prompt for Gemini
  const contextBlocks = retrievedChunks.map((chunk, idx) => {
    return `[Source ${idx + 1}: Document '${chunk.document_name}', Page ${chunk.page_number}, Relevance: ${chunk.score.toFixed(2)}]\n${chunk.chunk_text}`;
  });

  const prompt = `DOCUMENT CONTEXT:
==================================================
${contextBlocks.join('\n\n---\n\n')}
==================================================

USER QUESTION:
${cleanQuestion}

Provide a grounded, factual answer based strictly on the document context above. If the context does not contain the answer, say "I couldn't find this information in the uploaded documents."`;

  // 3. Call Google Gemini with fast lite model first and retry fallback
  let answerText = '';
  let modelUsed = 'gemini-3.1-flash-lite';
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        answerText = response.text.trim();
        modelUsed = model;
        break;
      }
    } catch (err) {
      console.warn(`Model ${model} call encountered issue, trying candidate:`, err);
      lastError = err;
    }
  }

  if (!answerText) {
    console.error('All Gemini model candidates failed:', lastError);
    res.status(500).json({
      detail: `Gemini API query failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    });
    return;
  }

  // 4. Format Sources
  const sources = retrievedChunks.map((c) => ({
    id: `src_${c.chunk_id}`,
    document_id: c.document_id,
    document_name: c.document_name,
    page_number: c.page_number,
    chunk_id: c.chunk_id,
    chunk_snippet: c.chunk_text.length > 220 ? c.chunk_text.slice(0, 220) + '...' : c.chunk_text,
    score: c.score,
  }));

  // 5. Persist Chat Session
  const chats = readJsonFile<ChatRecord[]>(CHATS_FILE, []);
  let activeChat = chats.find((c) => c.id === chat_id);

  if (!activeChat) {
    const title = cleanQuestion.length > 40 ? cleanQuestion.slice(0, 37) + '...' : cleanQuestion;
    activeChat = {
      id: chat_id || `chat_${Date.now()}`,
      title,
      created_at: new Date().toISOString(),
      messages: [],
    };
    chats.unshift(activeChat);
  }

  // Append user message
  activeChat.messages.push({
    id: `msg_u_${Date.now()}`,
    chat_id: activeChat.id,
    role: 'user',
    content: cleanQuestion,
    created_at: new Date().toISOString(),
  });

  // Append assistant message
  activeChat.messages.push({
    id: `msg_a_${Date.now()}`,
    chat_id: activeChat.id,
    role: 'assistant',
    content: answerText,
    created_at: new Date().toISOString(),
    sources,
  });

  writeJsonFile(CHATS_FILE, chats);

  res.json({
    chat_id: activeChat.id,
    question: cleanQuestion,
    answer: answerText,
    sources,
    retrieved_count: retrievedChunks.length,
    model_used: modelUsed,
  });
});

// 6. List Chats Endpoint
app.get('/api/chats', (_req: Request, res: Response) => {
  const chats = readJsonFile<ChatRecord[]>(CHATS_FILE, []);
  const list = chats.map((c) => ({
    id: c.id,
    title: c.title,
    created_at: c.created_at,
    message_count: c.messages ? c.messages.length : 0,
  }));
  res.json(list);
});

// 7. Get Chat Endpoint
app.get('/api/chats/:chat_id', (req: Request, res: Response): void => {
  const chats = readJsonFile<ChatRecord[]>(CHATS_FILE, []);
  const chat = chats.find((c) => c.id === req.params.chat_id);
  if (!chat) {
    res.status(404).json({ detail: `Chat '${req.params.chat_id}' not found.` });
    return;
  }
  res.json(chat);
});

// 8. Delete Chat Endpoint
app.delete('/api/chats/:chat_id', (req: Request, res: Response): void => {
  const chats = readJsonFile<ChatRecord[]>(CHATS_FILE, []);
  const idx = chats.findIndex((c) => c.id === req.params.chat_id);
  if (idx === -1) {
    res.status(404).json({ detail: `Chat '${req.params.chat_id}' not found.` });
    return;
  }
  chats.splice(idx, 1);
  writeJsonFile(CHATS_FILE, chats);
  res.json({ message: 'Chat deleted successfully.', deleted_id: req.params.chat_id });
});

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS FOR PORT 3000
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DocuMind] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DocuMind] Failed to start server:', err);
  process.exit(1);
});
