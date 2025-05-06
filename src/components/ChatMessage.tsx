// src/components/ChatMessage.tsx
import React from 'react';
import { Message } from '@/lib/types';
import { FaUser, FaRobot } from 'react-icons/fa';
import { Part } from "@google/generative-ai";

interface Props {
  message: Message;
}

// Helper to render content which might be string or Part[]
const renderContent = (content: string | Part[]) => {
  if (typeof content === 'string') {
    // Basic rendering for string content, handle newlines
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  }
  // For Part[], render the text parts (ignore inlineData for display here)
  // A more sophisticated renderer could display image previews etc. if needed
  return content.map((part, index) => {
    if ('text' in part) {
      return <span key={index}>{part.text}</span>;
    }
    return null; // Don't render non-text parts directly in chat bubble
  });
};


const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          <FaRobot size={18} />
        </div>
      )}
      <div
        className={`max-w-[75%] p-3 rounded-lg shadow ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
      >
        {message.fileInfo && (
          <div className="mb-2 text-xs italic opacity-80 border-b pb-1 border-gray-400">
            Attached: {message.fileInfo.name} ({message.fileInfo.type})
          </div>
        )}
        <div className="prose prose-sm max-w-none text-inherit break-words whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>
        {/* Optional: Timestamp */}
        {/* <div className="text-xs opacity-60 mt-1 text-right">
             {new Date(message.timestamp).toLocaleTimeString()}
         </div> */}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
          <FaUser size={18} />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;