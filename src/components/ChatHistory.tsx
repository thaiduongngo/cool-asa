// src/components/ChatHistory.tsx
import React from 'react';
import { ChatSession } from '@/lib/types';
import { FaTrash } from 'react-icons/fa';

interface Props {
  history: ChatSession[];
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatHistory: React.FC<Props> = ({ history, currentChatId, onLoadChat, onDeleteChat }) => {


  return (
    <div className="mb-6" >
      <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Chat History</h3>
      {
        history.length === 0 ?
          (<span className="mb-2 px-2 text-sm text-gray-400">No chat history.</span>) :
          (
            <ul className="space-y-1">
              {history.map((chat) => (
                <li
                  key={chat.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${chat.id === currentChatId
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <span
                    onClick={() => onLoadChat(chat.id)}
                    className="truncate flex-grow mr-2"
                    title={chat.title} // Show full title on hover
                  >
                    {chat.title || `Chat from ${new Date(chat.lastUpdated).toLocaleDateString()}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent li click
                      if (window.confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    aria-label="Delete chat"
                  >
                    <FaTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>)
      };
    </div >
  );
};

export default ChatHistory;