import React from 'react';
import { RecentPrompt } from '@/lib/types';
import { FaTimes } from 'react-icons/fa';

interface Props {
  prompts: RecentPrompt[];
  onSelectPrompt: (promptText: string) => void;
  onDeletePrompt: (promptId: string) => void;
}

const RecentPrompts: React.FC<Props> = ({ prompts, onSelectPrompt, onDeletePrompt }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-red-700 mb-2 px-2">Recent Prompts</h3>
      {prompts.length === 0 ?
        (<span className="mb-2 px-2 text-sm text-gray-400">No recent prompts.</span>) :
        (
          <ul className="space-y-1">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-red-100 hover:font-medium cursor-pointer text-sm text-gray-700">
                <span
                  onClick={() => onSelectPrompt(prompt.text)}
                  className="line-clamp-1 flex-grow mr-2"
                  title={prompt.text}
                >
                  {prompt.text}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent li click
                    onDeletePrompt(prompt.id);
                  }}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Delete prompt"
                >
                  <FaTimes size={14} />
                </button>
              </li>
            ))}
          </ul>
        )
      }
    </div >
  );
};

export default RecentPrompts;