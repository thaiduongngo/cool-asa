// src/components/RecentPrompts.tsx
import React from 'react';
import { RecentPrompt } from '@/lib/types';
import { FaTrash, FaSpinner } from 'react-icons/fa';

interface Props {
  prompts: RecentPrompt[];
  isLoading: boolean;
  onSelectPrompt: (promptText: string) => void;
  onDeletePrompt: (promptText: string) => void;
}

const RecentPrompts: React.FC<Props> = ({ prompts, isLoading, onSelectPrompt, onDeletePrompt }) => {
  return (
    <div className="mb-6 px-2">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Recent Prompts</h3>
      {
        isLoading ? (
          <div className="flex items-center justify-center text-gray-400 py-2">
            <FaSpinner className="animate-spin mr-2" /> Loading...
          </div>

        ) : prompts.length === 0 ? (
          <p className="text-xs text-gray-400 mb-2">No recent prompts.</p>
        ) : (
          <ul className="space-y-1">
            {prompts.map((prompt) => (
              <li key={prompt.id}
                className="group flex items-center justify-between p-2 rounded-md
              hover:bg-red-400 hover:text-gray-100 cursor-pointer text-sm text-red-700">
                <span
                  onClick={() => onSelectPrompt(prompt.text)}
                  className="line-clamp-1 flex-grow mr-2"
                  title={prompt.text}
                >
                  {prompt.text}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePrompt(prompt.text);
                  }}
                  className="text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Delete prompt"
                >
                  <FaTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
};

export default RecentPrompts;