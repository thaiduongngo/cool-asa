export declare type Role = "user" | "model" | "system";

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

export declare interface Content {
  /** List of parts that constitute a single message. Each part may have
   a different IANA MIME type. */
  parts?: Part[];
  /** Optional. The producer of the content. Must be either 'user' or
   'model'. Useful to set for multi-turn conversations, otherwise can be
   empty. If role is not specified, SDK will determine the role. */
  role?: string;
}