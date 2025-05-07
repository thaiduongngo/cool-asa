// src/components/Sidebar.tsx
import React from 'react';
import { FaPlus, FaBars, FaTimes } from 'react-icons/fa';
import RecentPrompts from './RecentPrompts';
import ChatHistory from './ChatHistory';
import { RecentPrompt, ChatSession } from '@/lib/types';

interface Props {
  recentPrompts: RecentPrompt[];
  chatHistory: ChatSession[];
  currentChatId: string | null;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onDeletePrompt: (promptId: string) => void;
  onSelectPrompt: (promptText: string) => void;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<Props> = ({
  recentPrompts,
  chatHistory,
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
      {/* Mobile Toggle Button (visible only on small screens) */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar} // Close sidebar when overlay is clicked
        ></div>
      )}


      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-gray-100 border-r border-gray-200 w-64 md:w-72 lg:w-80 p-4 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Close button inside sidebar for mobile */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-4 md:hidden p-1 text-gray-500 hover:text-gray-700"
          aria-label="Close sidebar"
        >
          <FaTimes size={20} />
        </button>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 w-full p-2 mb-6 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
        >
          <FaPlus size={16} />
          New Chat
        </button>

        {/* Content Area (Scrollable) */}
        <div className="flex-grow overflow-y-auto space-y-6 pr-1">
          {/* Recent Prompts */}
          <RecentPrompts
            prompts={recentPrompts}
            onSelectPrompt={onSelectPrompt}
            onDeletePrompt={onDeletePrompt}
          />

          {/* Chat History */}
          <ChatHistory
            history={chatHistory}
            currentChatId={currentChatId}
            onLoadChat={onLoadChat}
            onDeleteChat={onDeleteChat}
          />
        </div>

        {/* Footer */}
        <div className="mt-auto text-center text-xs text-gray-400">
          ASA
        </div>
      </aside>
    </>
  );
};

export default Sidebar;