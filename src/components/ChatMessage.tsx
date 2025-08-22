import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '@/lib/types';
import { getTextForMarkdown } from '@/utils/markdownHelper';
import { FaUser, FaRobot, FaTrash } from 'react-icons/fa';

interface Props {
  message: Message;
  onDeleteMessage: (messageId: string) => void;
}

const ChatMessage: React.FC<Props> = ({ message, onDeleteMessage }) => {
  const isUser = message.role === 'user';
  const markdownText = getTextForMarkdown(message.content);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering other click events on the message
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(message.id);
    }
  };

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'} relative`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
          <FaRobot size={18} />
        </div>
      )}
      <div
        className={`group max-w-[85%] md:max-w-[75%] p-3 rounded-lg shadow ${isUser ?
          'bg-red-600 text-white' :
          'bg-gray-100 text-gray-800'
          } relative`}
      >
        {
          message.fileInfos && message.fileInfos.map((v, i) => {
            return (
              <div key={i}
                className={`mb-2 text-xs italic opacity-80 border-b pb-1 ${isUser ? 'border-red-300' : 'border-gray-300'}`}>
                Attached: {v.name} {v.type}
              </div>
            );
          })
        }
        {message.voicePrompt && (
          <div className={`mb-2 text-xs italic opacity-80 border-b pb-1 ${isUser ? 'border-red-300' : 'border-gray-300'}`}>
            {message.voicePrompt.name} ({message.voicePrompt.type})
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
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false }]]}
            components={{
              a: ({ ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
              pre: ({ ...props }) => <pre className="text-red-700 bg-red-200 text-wrap p-2 rounded" {...props} />,
              code: ({ ...props }) => {
                const { inline, ...rest } = props as React.HTMLAttributes<HTMLElement> & { inline?: boolean };
                return inline ? (
                  <code className="bg-red-100 text-red-700 px-1 rounded font-mono" {...rest} />
                ) : (
                  <code className="block text-red-700 whitespace-pre-wrap font-mono" {...rest} />
                );
              }
            }}
          >
            {markdownText}
          </ReactMarkdown>
        </div>
        <div className={`text-xs opacity-60 mt-1 text-right ${isUser ? 'text-red-200' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
        <button
          onClick={handleDeleteClick}
          className={`
            absolute p-1.5 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150
            ${isUser ?
              'right-13 -translate-x-full bottom-2 text-gray-100 hover:text-red-600 hover:bg-gray-100' :
              'right-13 -translate-x-full bottom-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
          aria-label="Delete message"
          title="Delete message"
        >
          <FaTrash size={15} />
        </button>
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
