import React, { useRef, useState, ChangeEvent, KeyboardEvent } from 'react';
import { FaPaperPlane, FaPaperclip, FaSpinner } from 'react-icons/fa';
import FilePreview from './FilePreview';
import { AttachedFile } from '@/lib/types';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB, validateFile } from '@/utils/fileHelper';

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: () => void;
  isLoading: boolean;
  attachedFile: AttachedFile | null;
}

const ChatInput: React.FC<Props> = ({
  input,
  onInputChange,
  onSendMessage,
  onAttachFile,
  onRemoveFile,
  isLoading,
  attachedFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFileError(null); // Clear previous errors
    const file = event.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setFileError(validationError);
        // Clear the input value so the user can select again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      onAttachFile(file);
      // Optional: Clear the input value if you want to allow selecting the same file again after removing it
      // if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(event.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading && (input.trim() || attachedFile)) {
      event.preventDefault(); // Prevent newline
      onSendMessage();
    }
  };

  const handleRemoveFileInternal = () => {
    onRemoveFile();
    setFileError(null); // Clear error when file is removed
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
  }

  const canSend = !isLoading && (input.trim().length > 0 || !!attachedFile);

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {/* File Error Display */}
      {fileError && (
        <div className="mb-2 p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
          {fileError}
        </div>
      )}

      {/* File Preview */}
      <FilePreview attachedFile={attachedFile} onRemove={handleRemoveFileInternal} />

      <div className="flex items-end gap-2 mt-2">
        {/* Attach Button */}
        <button
          onClick={handleAttachClick}
          disabled={isLoading || !!attachedFile} // Disable if loading or file already attached
          className={`p-2 text-gray-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${attachedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Attach file"
        >
          <FaPaperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ALLOWED_FILE_TYPES.join(',')} // Use allowed types
          className="hidden"
          disabled={isLoading || !!attachedFile}
        />

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or attach a file..."
          className="flex-grow p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-300 max-h-40 overflow-y-auto text-sm text-gray-800"
          rows={1} // Start with one row
          disabled={isLoading}
        />

        <button
          onClick={onSendMessage}
          disabled={!canSend}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          aria-label={isLoading ? 'Sending...' : 'Send message'}
        >
          {isLoading ? <FaSpinner className="animate-spin" size={20} /> : <FaPaperPlane size={20} />}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">
        Attach one image or PDF (Max {MAX_FILE_SIZE_MB}MB). Shift+Enter for newline.
      </p>
    </div>
  );
};

export default ChatInput;