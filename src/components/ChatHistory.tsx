// src/components/ChatHistory.tsx
import React from 'react';
import { ChatSession } from '@/lib/types';
import { FaTrash, FaSpinner } from 'react-icons/fa'; // Added FaSpinner

interface Props {
  history: ChatSession[];
  isLoading: boolean; // New prop
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatHistory: React.FC<Props> = ({ history, isLoading, currentChatId, onLoadChat, onDeleteChat }) => {
  if (isLoading) {
    return (
      <div className="mb-6 px-2">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Chat History</h3>
        <div className="flex items-center justify-center text-gray-400 py-2">
          <FaSpinner className="animate-spin mr-2" /> Loading...
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Chat History</h3>
        <p className="text-xs text-gray-400">No chat history found.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Chat History</h3>
      <ul className="space-y-1">
        {history.map((chat) => (
          <li
            key={chat.id}
            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm 
              ${chat.id === currentChatId
                ? 'bg-red-700 text-red-100 font-medium'
                : 'text-red-700 bg-gray-100 hover:text-gray-100 hover:bg-red-400'
              }`}
          >
            <span
              onClick={() => onLoadChat(chat.id)}
              className="line-clamp-1 flex-grow mr-2"
              title={chat.title}
            >
              {chat.title || `Chat from ${new Date(chat.lastUpdated).toLocaleDateString()}`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                  onDeleteChat(chat.id);
                }
              }}
              className="text-gray-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Delete chat"
            >
              <FaTrash size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatHistory;