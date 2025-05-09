import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Part } from '@/lib/types';
import { FaUser, FaRobot } from 'react-icons/fa';

interface Props {
  message: Message;
}

// Helper to extract text content from string or Part[] for Markdown rendering
const getTextForMarkdown = (content: string | Part[]): string => {
  if (typeof content === 'string') {
    return content;
  }
  // For Part[], concatenate text from text parts
  return content
    .filter(part => 'text' in part && typeof part.text === 'string')
    .map(part => (part as { text: string }).text) // Type assertion
    .join(''); // Join text parts, model might send multiple text parts
};

const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const markdownText = getTextForMarkdown(message.content);

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
          <FaRobot size={18} />
        </div>
      )}
      <div
        className={`max-w-[85%] md:max-w-[75%] p-3 rounded-lg shadow ${isUser ?
          'bg-red-600 text-white' :
          'bg-gray-100 text-gray-800'
          }`}
      >
        {message.fileInfo && (
          <div className={`mb-2 text-xs italic opacity-80 border-b pb-1 ${isUser ? 'border-red-300' : 'border-gray-300'}`}>
            Attached: {message.fileInfo.name} ({message.fileInfo.type})
          </div>
        )}
        <div
          className={`
                prose prose-sm max-w-none
                ${isUser ? 'prose-invert' : ''} // Invert prose colors for dark user bubble
                break-words // Keep break-words
            `}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            // Customize rendering of specific elements if needed
            components={{
              // Example: Style links
              a: ({ node, ...props }) => <a className="text-red-400 hover:underline" {...props} />,
              // Example: Style code blocks (Tailwind prose should handle this well by default)
              pre: ({ node, ...props }) => <pre className="text-red-800 bg-red-200 text-wrap p-2 rounded" {...props} />,
              // code: ({node, inline, ...props}) => {
              //   return inline ? (
              //     <code className="bg-gray-200 text-red-500 px-1 rounded" {...props} />
              //   ) : (
              //     <code className="block whitespace-pre-wrap" {...props} />
              //   );
              // }
            }}
          >
            {markdownText}
          </ReactMarkdown>
        </div>
        {/* Timestamp */}
        <div className={`text-xs opacity-60 mt-1 text-right ${isUser ? 'text-red-200' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
          <FaUser size={18} />
        </div>
      )
      }
    </div >
  );
};

export default ChatMessage;