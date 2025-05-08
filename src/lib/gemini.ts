import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
}
  from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.0-flash";
const MODEL_NAME = process.env.MODEL_NAME || DEFAULT_MODEL;
const API_KEY = process.env.GOOGLE_API_KEY;
const SYSTEM_INSTRUCTION = `Trả lời chi tiết bằng tiếng Việt. Responses are rendered in markdown with clear indents and highlights.`;

if (!API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const GENERATION_CONFIG = {
  temperature: 0,
  topP: 0.95,
  maxOutputTokens: 65536,
};

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  safetySettings: SAFETY_SETTINGS,
  generationConfig: GENERATION_CONFIG,
  systemInstruction: SYSTEM_INSTRUCTION,
});

export { model };