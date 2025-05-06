// src/lib/types.ts
import { Part } from "@google/generative-ai";

export interface Message {
  id: string;
  role: "user" | "model";
  // Content can be simple text or complex parts for multimodal input
  content: string | Part[];
  timestamp: number;
  // Optional: Store file info if message originated from file upload
  fileInfo?: { name: string; type: string };
}

export interface ChatSession {
  id: string;
  title: string; // e.g., first user message
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