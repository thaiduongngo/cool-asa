import ollama from 'ollama';
import { Message } from 'ollama';
import { Content, Part } from '@/lib/types';

const DEFAULT_MODEL = "qwen3:8b";
const MODEL_NAME = DEFAULT_MODEL;
const SYSTEM_INSTRUCTION = `Trả lời chi tiết bằng tiếng Việt. Responses are rendered in markdown with clear indents and highlights.`;
const OPTIONS = {
  num_ctx: 8192,
  // num_ctx: 65536,
  // top_p: 0.95,
  temperature: 0,
}

const generateContentStream = async (contents: Content[]) => {
  let messages: Message[] = [
    {
      role: 'system',
      content: SYSTEM_INSTRUCTION
    }
  ];

  contents.forEach((content: Content) => {
    const mes = content.parts.map((part: Part) => {
      return {
        role: content.role,
        content: part.text || "Attached file.",
        images: part.inlineData?.data ? [part.inlineData.data] : undefined
      };
    });
    messages.push(...mes);
  });

  return await ollama.chat(
    {
      model: MODEL_NAME,
      messages: messages,
      stream: true,
      options: OPTIONS,
    }
  );
};

export { generateContentStream };