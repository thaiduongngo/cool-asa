'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Part } from "@google/generative-ai";
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Message, ChatSession, RecentPrompt, ApiFileData, AttachedFile } from '@/lib/types';
import { prepareFileDataForApi } from '@/utils/fileHelper';


const MAX_RECENT_PROMPTS = 5;
const MAX_CHAT_HISTORY = 5;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  // Persistence using custom hook
  const [recentPrompts, setRecentPrompts] = useLocalStorage<RecentPrompt[]>('recentPrompts', []);
  const [chatHistory, setChatHistory] = useLocalStorage<ChatSession[]>('chatHistory', []);

  // Sidebar state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial chat or create a new one
  useEffect(() => {
    if (!currentChatId && chatHistory.length > 0) {
      // Optional: Load the most recent chat on initial load
      // handleLoadChat(chatHistory[0].id);
    } else if (!currentChatId) {
      startNewChat(); // Ensure a chat exists if history is empty
    }
    // Check screen size on initial load for sidebar default
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) { // Tailwind's md breakpoint
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []); // Run only once on mount


  // --- Core Chat Logic ---

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachedFile) return; // Need either text or a file

    setIsLoading(true);
    setError(null);

    const userMessageId = uuidv4();
    let fileDataForApi: ApiFileData | null = null;
    let userMessageContent: string | Part[] = trimmedInput; // Default to text

    // --- Prepare File Data (if attached) ---
    if (attachedFile) {
      fileDataForApi = await prepareFileDataForApi(attachedFile.file);
      if (!fileDataForApi) {
        setError("Error processing file. Please try again.");
        setIsLoading(false);
        return; // Stop if file processing failed
      }

      // Construct multimodal content part
      const filePart: Part = {
        inlineData: { mimeType: fileDataForApi.mimeType, data: fileDataForApi.base64Data }
      };
      userMessageContent = trimmedInput ? [{ text: trimmedInput }, filePart] : [filePart];
    }

    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      ...(attachedFile && { fileInfo: { name: attachedFile.file.name, type: attachedFile.file.type } }) // Add file info if present
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // --- Add to Recent Prompts ---
    if (trimmedInput) {
      addRecentPrompt(trimmedInput);
    }

    // --- Clear Input ---
    setInput('');
    setAttachedFile(null); // Clear attached file after sending

    // --- Prepare history for API ---
    const apiHistory = messages
      // Filter out any potential incomplete model messages from previous runs if needed
      // .filter(msg => msg.role === 'user' || (msg.role === 'model' && msg.content))
      .map(msg => ({
        role: msg.role,
        parts: typeof msg.content === 'string' ? [{ text: msg.content }] : msg.content // Ensure content is always Part[] for API history
      }));


    // --- Call API and Handle Stream ---
    let streamEnded = false; // Flag to track if stream finished properly
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmedInput, // Send original trimmed input text
          history: apiHistory,
          fileData: fileDataForApi // Send prepared file data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // --- Stream Processing ---
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let modelResponse = '';
      const modelMessageId = uuidv4();

      // Add a placeholder for the model's message
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', content: '...', timestamp: Date.now() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamEnded = true;
          break; // Exit loop when stream is finished
        }

        const chunk = decoder.decode(value, { stream: true }); // stream: true handles multi-byte chars potentially split across chunks

        // Check for custom error signal from API route
        if (chunk.includes('STREAM_ERROR:')) {
          const errorMessage = chunk.split('STREAM_ERROR:')[1].trim();
          console.error("Streaming Error:", errorMessage);
          setError(`Error during streaming: ${errorMessage}`);
          // Remove placeholder or update it with error? Choose one.
          setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
          streamEnded = true; // Mark as ended even on error
          break; // Stop processing on stream error
        }

        modelResponse += chunk;

        // Update the model message content progressively
        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMessageId ? { ...msg, content: modelResponse } : msg
          )
        );
      }

      // Final cleanup if stream ended without error signal
      if (streamEnded && !error) {
        // Ensure the final complete message is set
        const finalModelMessage: Message = { id: modelMessageId, role: 'model', content: modelResponse, timestamp: Date.now() };
        setMessages(prev => {
          const finalMessages = prev.map(msg => msg.id === modelMessageId ? finalModelMessage : msg);
          // Save chat AFTER the final message is set
          saveChatSession(finalMessages);
          return finalMessages;
        });
      } else if (!streamEnded) {
        console.error("Stream ended unexpectedly or timed out");
        setError("The response stream ended unexpectedly.");
        // Decide how to handle incomplete messages (e.g., remove placeholder)
        setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
      }


    } catch (err: any) {
      console.error("Send Message Error:", err);
      setError(err.message || 'An unexpected error occurred.');
      // Clean up placeholder if an error occurs before or during streaming start
      if (!streamEnded) {
        setMessages(prev => prev.filter(msg => msg.role === 'user')); // Remove only user message maybe? Or keep user, remove potential placeholder
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, attachedFile, currentChatId, chatHistory, setChatHistory, setRecentPrompts]); // Added dependencies

  // --- Helper Functions ---

  const addRecentPrompt = (promptText: string) => {
    setRecentPrompts(prev => {
      const newPrompt: RecentPrompt = { id: uuidv4(), text: promptText };
      // Avoid duplicates and limit size
      const filtered = prev.filter(p => p.text !== promptText);
      return [newPrompt, ...filtered].slice(0, MAX_RECENT_PROMPTS);
    });
  };

  const handleDeletePrompt = (promptId: string) => {
    setRecentPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleSelectPrompt = (promptText: string) => {
    setInput(promptText);
    // Optionally focus the input field here
  };

  const saveChatSession = (finalMessages: Message[]) => {
    if (finalMessages.length === 0) return; // Don't save empty chats

    const chatTitle = typeof finalMessages[0].content === 'string'
      ? finalMessages[0].content.substring(0, 50) // First 50 chars of first user message
      : finalMessages[0].fileInfo?.name // Or file name if first message was file-only
      || "Untitled Chat"; // Fallback title

    const session: ChatSession = {
      id: chatTitle, // Use current ID or generate new if it's a new chat
      title: chatTitle,
      messages: finalMessages,
      lastUpdated: Date.now(),
    };

    setChatHistory(prev => {
      const existingIndex = prev.findIndex(c => c.id === session.id);
      let updatedHistory;
      if (existingIndex > -1) {
        // Update existing chat
        updatedHistory = [...prev];
        updatedHistory[existingIndex] = session;
      } else {
        // Add new chat
        updatedHistory = [session, ...prev];
      }
      // Sort by lastUpdated (most recent first) and limit size
      return updatedHistory
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, MAX_CHAT_HISTORY);
    });

    // Ensure the currentChatId is set for the saved session
    if (!currentChatId) {
      setCurrentChatId(session.id);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setCurrentChatId(null); // Indicate it's a new chat until first message is sent
    setError(null);
    setIsLoading(false);
    setAttachedFile(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile for new chat
    console.log("Starting new chat");
  };

  const handleLoadChat = (chatId: string) => {
    const chatToLoad = chatHistory.find(c => c.id === chatId);
    if (chatToLoad) {
      setMessages(chatToLoad.messages);
      setCurrentChatId(chatToLoad.id);
      setInput(''); // Clear input when loading
      setError(null);
      setIsLoading(false);
      setAttachedFile(null);
      if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
      console.log("Loaded chat:", chatId);
    } else {
      console.error("Chat not found:", chatId);
      setError("Could not load the selected chat.");
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    // If the deleted chat was the current one, start a new chat
    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  const handleAttachFile = (file: File) => {
    // We only allow one file, so replace if one exists
    setAttachedFile({ file });
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- Render ---

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        recentPrompts={recentPrompts}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        isSidebarOpen={isSidebarOpen}
        onNewChat={startNewChat}
        onDeletePrompt={handleDeletePrompt}
        onSelectPrompt={handleSelectPrompt}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Chat Area */}
      <main className={`flex flex-col flex-1 h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-0' : 'md:ml-0'} `}>
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white shadow-inner">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {/* Loading Indicator within chat */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              {/* Placeholder while waiting for the stream to start */}
              <div className="p-3 rounded-lg shadow bg-gray-200 text-gray-500 italic">
                Thinking...
              </div>
            </div>
          )}
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
        </div>

        {/* Chat Input Area */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onAttachFile={handleAttachFile}
          onRemoveFile={handleRemoveFile}
          isLoading={isLoading}
          attachedFile={attachedFile}
        />
      </main>
    </div>
  );
}