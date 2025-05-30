import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentConfig,
  ThinkingConfig,
} from '@google/genai';
import { Content } from '@/lib/types';
import { SYSTEM_INSTRUCTION } from '@/lib/constants'

const DEFAULT_MODEL = "gemini-2.0-flash";
const MODEL_NAME = process.env.GEMINI_MODEL || DEFAULT_MODEL;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined in environment variables");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const tools = [
  { urlContext: {} },
  { googleSearch: {} },
];

const thinkingConfig = (): ThinkingConfig => {
  if (process.env.INCLUDE_THOUGHTS && process.env.INCLUDE_THOUGHTS.toLowerCase() === "true") {
    return {
      includeThoughts: true,
      thinkingBudget: Number(process.env.THINKING_BUDGET ?? 8192),
    };
  } else {
    return {
      includeThoughts: false,
    };
  }
};

const config: GenerateContentConfig = {
  temperature: Number(process.env.TEMPERATURE ?? 0),
  topP: 0.95,
  maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS ?? 65536),
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
  responseMimeType: 'text/plain',
  systemInstruction: [
    {
      text: SYSTEM_INSTRUCTION,
    }
  ],
  tools: tools,
  thinkingConfig: thinkingConfig(),
};

const generateContentStream = async (contents: Content[]) => {
  return await ai.models.generateContentStream({
    model: MODEL_NAME,
    config: config,
    contents: contents,
  });
};

export { generateContentStream };