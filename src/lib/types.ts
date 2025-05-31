export const USER = 'user';
export const MODEL = 'model';
export const ASSISTANT = 'assistant';
export const SYSTEM = 'system';

export declare type Role = 'user' | 'model' | 'system' | 'assistant';

export declare interface FileData {
  mimeType: string;
  fileUri: string;
}

export declare interface GenerativeContentBlob {
  mimeType: string;
  data: string;
}

export declare interface TextPart {
  text: string;
  inlineData?: never;
  functionCall?: never;
  functionResponse?: never;
  fileData?: never;
  executableCode?: never;
  codeExecutionResult?: never;
}

export declare interface FileDataPart {
  text?: never;
  inlineData?: never;
  functionCall?: never;
  functionResponse?: never;
  fileData: FileData;
  executableCode?: never;
  codeExecutionResult?: never;
}

export declare interface InlineDataPart {
  text?: never;
  inlineData: GenerativeContentBlob;
  functionCall?: never;
  functionResponse?: never;
  fileData?: never;
  executableCode?: never;
  codeExecutionResult?: never;
}

export declare type Part = TextPart | InlineDataPart | FileDataPart;

export interface Message {
  id: string;
  role: Role;
  content: string | Part[];
  timestamp: number;
  fileInfos?: {
    name: string;
    type: string;
  }[];
  voicePrompt?: {
    name: string;
    data: string;
    type: string;
  };
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

export interface ApiFileData {
  mimeType: string;
  base64Data: string;
  name: string;
}

export interface AttachedFile {
  id: string;
  file: File;
  previewUrl?: string;
}

export interface Prompt {
  prompt: string;
  voicePrompt?: ApiFileData;
  history: {
    role: Role,
    parts: Part[]
  }[],
  filesData?: ApiFileData[],
}

export declare interface Content {
  parts: Part[];
  role: string;
}

export declare interface AppConfig {
  maxFileSizeMB: number,
  allowedFileTypes: [string],
}
