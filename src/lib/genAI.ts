import { generateContentStream as generateContentStreamOllama } from '@/lib/ollama';
import { generateContentStream as generateContentStreamGemini } from '@/lib/gemini';
import { Content } from '@/lib/types';
import { GOOGLE, OLLAMA } from '@/lib/constants';

const DEFAULT_AI_PROVIDER = GOOGLE;
const AI_PROVIDER = process.env.AI_PROVIDER ?? DEFAULT_AI_PROVIDER;

const generateContentStream = (contents: Content[]) => {
  return AI_PROVIDER === GOOGLE ? generateContentStreamGemini(contents) :
    AI_PROVIDER === OLLAMA ? generateContentStreamOllama(contents) : undefined;
};

export { generateContentStream };