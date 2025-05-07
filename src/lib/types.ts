import { Part } from "@google/generative-ai";

export declare type Role = "user" | "model" | "system";

export interface Message {
  id: string;
  role: Role;
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
    role: Role,
    parts: Part[]
  }[],
  fileData?: ApiFileData
}

export type { Part }