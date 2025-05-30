import ollama from 'ollama';
import { Message } from 'ollama';
import { Content, Part, SYSTEM, ASSISTANT, MODEL } from '@/lib/types';
import { SYSTEM_INSTRUCTION } from '@/lib/constants';

const DEFAULT_MODEL = "qwen3:8b";
const MODEL_NAME = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
const OPTIONS = {
  num_ctx: Number(process.env.MAX_OUTPUT_TOKENS ?? 65536),
  temperature: Number(process.env.TEMPERATURE ?? 0),
}

const generateContentStream = async (contents: Content[]) => {
  let messages: Message[] = SYSTEM_INSTRUCTION ? [
    {
      role: SYSTEM,
      content: SYSTEM_INSTRUCTION
    }
  ] : [];

  contents.forEach((content: Content) => {
    let msg = {
      role: content.role === MODEL ? ASSISTANT : content.role,
      content: "",
      images: [] as string[],
    };
    content.parts.forEach((part: Part) => {
      if (part.text) msg.content = part.text
      if (part.inlineData?.data) {
        msg.images?.push(part.inlineData.data);
      }
    });
    messages.push(msg);
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