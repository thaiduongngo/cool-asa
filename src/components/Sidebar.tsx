// src/components/Sidebar.tsx
import React from 'react';
import { FaPlus, FaBars, FaTimes } from 'react-icons/fa';
import RecentPrompts from './RecentPrompts';
import ChatHistory from './ChatHistory';
import { RecentPrompt, ChatSession } from '@/lib/types';

interface Props {
  recentPrompts: RecentPrompt[];
  isRecentPromptsLoading: boolean;
  chatHistory: ChatSession[];
  isChatHistoryLoading: boolean;
  currentChatId: string | null;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onDeletePrompt: (promptText: string) => void; // ID is now text
  onSelectPrompt: (promptText: string) => void;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<Props> = ({
  recentPrompts,
  isRecentPromptsLoading,
  chatHistory,
  isChatHistoryLoading,
  currentChatId,
  isSidebarOpen,
  onNewChat,
  onDeletePrompt,
  onSelectPrompt,
  onLoadChat,
  onDeleteChat,
  toggleSidebar,
}) => {
  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-red-700 text-gray-100 rounded-md hover:bg-gray-600"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      {/* dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-gray-100
          w-64 md:w-72 lg:w-80 p-4 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 w-full p-2 mb-6 
          bg-red-500 text-gray-100 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
        >
          <FaPlus size={16} />
          New Chat
        </button>

        <div className="flex-grow overflow-y-auto space-y-6 pr-1">
          <RecentPrompts
            prompts={recentPrompts}
            isLoading={isRecentPromptsLoading} // Pass down
            onSelectPrompt={onSelectPrompt}
            onDeletePrompt={onDeletePrompt}
          />
          <ChatHistory
            history={chatHistory}
            isLoading={isChatHistoryLoading}
            currentChatId={currentChatId}
            onLoadChat={onLoadChat}
            onDeleteChat={onDeleteChat}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;