import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/genai';
import { Content } from '@/lib/types';

const DEFAULT_MODEL = "gemini-2.0-flash";
const MODEL_NAME = process.env.MODEL_NAME || DEFAULT_MODEL;
const API_KEY = process.env.GOOGLE_API_KEY;
const SYSTEM_INSTRUCTION = `Trả lời chi tiết bằng tiếng Việt. Responses are rendered in markdown with clear indents and highlights.`;

if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined in environment variables");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const config = {
  temperature: 0,
  topP: 0.95,
  maxOutputTokens: 65536,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,  // Block none
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,  // Block none
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,  // Block none
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,  // Block none
    },
  ],
  responseMimeType: 'text/plain',
  systemInstruction: [
    {
      text: SYSTEM_INSTRUCTION,
    }
  ],
};

const generateContentStream = async (contents: Content[]) => {
  return await ai.models.generateContentStream({
    model: MODEL_NAME,
    config: config,
    contents: contents,
  });
};

export { generateContentStream };