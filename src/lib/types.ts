// src/lib/types.ts
import { Part } from "@google/generative-ai";

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string | Part[];
  timestamp: number;
  fileInfo?: { name: string; type: string };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface RecentPrompt {
  id: string;
  text: string;
}

// Type for file data sent to the API
export interface ApiFileData {
  mimeType: string;
  base64Data: string;
  name: string; // Keep name for display/context
}

// Type for file state before sending
export interface AttachedFile {
  file: File;
  previewUrl?: string; // For images
}

// Type for prompt
export interface Prompt {
  prompt: string;
  history: {
    role: 'user' | 'model' | 'system',
    parts: Part[]
  }[],
  fileData?: ApiFileData
}