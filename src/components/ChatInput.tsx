import React, { useRef, useState, ChangeEvent, KeyboardEvent } from 'react';
import { FaPaperPlane, FaPaperclip, FaSpinner } from 'react-icons/fa';
import FilePreview from './FilePreview';
import { AttachedFile, AppConfig } from '@/lib/types';
import { validateFile, MAX_NUM_ATTACHED } from '@/utils/fileHelper';
import AudioRecorder from './AudioRecorder'
import { TextareaAutosize } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onAttachFile: (attachedFile: AttachedFile) => void;
  onRemoveFile: (id: string) => void;
  onVoicePrompt: (auBlob: Blob | null) => void;
  isLoading: boolean;
  attachedFiles: AttachedFile[] | [];
  auBlob: Blob | null;
  appConfig: AppConfig | null;
}

const ChatInput: React.FC<Props> = ({
  input,
  onInputChange,
  onSendMessage,
  onAttachFile,
  onRemoveFile,
  onVoicePrompt,
  isLoading,
  attachedFiles,
  auBlob,
  appConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const isAttachedFileAllowed = attachedFiles.length < MAX_NUM_ATTACHED ? true : false;
  const attachedFileExist = attachedFiles.length > 0 ? true : false;

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = event.target.files?.[0];
    if (file) {
      const validationError = validateFile(file, appConfig);
      if (validationError) {
        setFileError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      onAttachFile({ id: uuidv4(), file: file } as AttachedFile);
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
    if (event.key === 'Enter' && !event.shiftKey && !isLoading && (input.trim() || attachedFileExist || auBlob)) {
      event.preventDefault(); // Prevent newline
      onSendMessage();
    }
  };

  const handleRemoveFileInternal = (id: string) => {
    onRemoveFile(id);
    setFileError(null); // Clear error when file is removed
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
  }

  const canSend = !isLoading && (input.trim().length > 0 || attachedFileExist || auBlob);

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {/* File Error Display */}
      {
        fileError && (
          <div className="mb-2 p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
            {fileError}
          </div>
        )
      }

      {
        attachedFiles.map((v) => {
          return <FilePreview key={v.id} attachedFile={v}
            onRemove={() => handleRemoveFileInternal(v.id)} />;
        })
      }

      <div className="flex items-end gap-2 mt-2">
        <AudioRecorder onVoicePrompt={onVoicePrompt} auBlob={auBlob} />
        <button
          onClick={handleAttachClick}
          disabled={isLoading || !isAttachedFileAllowed} // Disable if loading or file already attached
          className={`p-2 text-gray-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 
            ${!isAttachedFileAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Attach file"
        >
          <FaPaperclip size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={appConfig?.allowedFileTypes.join(',')}
          className="hidden"
          disabled={isLoading || !isAttachedFileAllowed}
        />

        <TextareaAutosize
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or attach a file..."
          className="flex-grow p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-300 max-h-40 overflow-y-auto text-sm text-gray-800"
          minRows={1}
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
        Attach one image or PDF (Max {appConfig?.maxFileSizeMB}MB). Shift+Enter for newline.
      </p>
    </div>
  );
};

export default ChatInput;