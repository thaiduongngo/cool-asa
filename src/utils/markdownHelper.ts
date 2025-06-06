import { Part, TextPart } from '@/lib/types';

// Helper to extract text content from string or Part[] for Markdown rendering
export const getTextForMarkdown = (content: string | Part[]): string => {
  if (typeof content === 'string') {
    return content;
  } else {
    return content
      .filter(part => 'text' in part && typeof part.text === 'string')
      .map(part => (part as TextPart).text)
      .join('');
  }
};