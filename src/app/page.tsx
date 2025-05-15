'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Part } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Message, ChatSession, RecentPrompt, ApiFileData, AttachedFile } from '@/lib/types';
import { prepareFileDataForApi } from '@/utils/fileHelper';

const MAX_RECENT_PROMPTS = 10;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [recentPrompts, setRecentPrompts] = useLocalStorage<RecentPrompt[]>('recentPrompts', []);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true); // For loading initial history
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Fetch Initial Chat History ---
  const fetchChatHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/chat/history');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch history" }));
        throw new Error(errorData.error || `Failed to fetch chat history: ${response.statusText}`);
      }
      const data: ChatSession[] = await response.json();
      setChatHistory(data);
      // Optional: Load the most recent chat if history is not empty and no chat is active
      if (data.length > 0 && !currentChatId) {
        // handleLoadChat(data[0].id); // Or simply let user pick
      } else if (data.length === 0 && !currentChatId) {
        startNewChat(false); // Start a new chat session if history is empty, don't clear if already new
      }
    } catch (err: any) {
      console.error('Error fetching chat history:', err);
      setError(`Could not load chat history: ${err.message}`);
      // Proceed with an empty history if fetch fails
      setChatHistory([]);
      startNewChat(false);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [currentChatId]); // Add currentChatId to dependencies if its change should trigger reload

  useEffect(() => {
    fetchChatHistory();

    const checkScreenSize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [fetchChatHistory]); // fetchChatHistory is memoized

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // --- Helper Functions (Modified for API calls) ---
  const addRecentPrompt = useCallback((promptText: string) => {
    setRecentPrompts(prev => {
      const newPrompt: RecentPrompt = { id: uuidv4(), text: promptText };
      const filtered = prev.filter(p => p.text !== promptText);
      return [newPrompt, ...filtered].slice(0, MAX_RECENT_PROMPTS);
    });
  }, [setRecentPrompts]);

  // --- Core Chat Logic (handleSendMessage) ---
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachedFile) return;

    setIsLoading(true);
    setError(null);

    const chatId = currentChatId ?? uuidv4();
    const userMessageId = uuidv4();
    let fileDataForApi: ApiFileData | null = null;
    let userMessageContent: string | Part[] = trimmedInput;

    if (attachedFile) {
      fileDataForApi = await prepareFileDataForApi(attachedFile.file);
      if (!fileDataForApi) {
        setError("Error processing file. Please try again.");
        setIsLoading(false);
        return;
      }
      // Convert @google/generative-ai Part to local Part type
      const filePart: Part = { inlineData: { mimeType: fileDataForApi.mimeType, data: fileDataForApi.base64Data } };
      userMessageContent = trimmedInput
        ? [{ text: trimmedInput } as Part, filePart]
        : [filePart];
    }

    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      ...(attachedFile && { fileInfo: { name: attachedFile.file.name, type: attachedFile.file.type } })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (trimmedInput) addRecentPrompt(trimmedInput);
    setInput('');
    setAttachedFile(null);

    const apiHistory = messages.map(msg => ({
      role: msg.role,
      parts: typeof msg.content === 'string' ? [{ text: msg.content }] : msg.content
    }));

    let streamEnded = false;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedInput, history: apiHistory, fileData: fileDataForApi }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let modelResponse = '';
      const modelMessageId = uuidv4();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', content: '...', timestamp: Date.now() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) { streamEnded = true; break; }
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes('STREAM_ERROR:')) {
          const errorMessage = chunk.split('STREAM_ERROR:')[1].trim();
          setError(`Error during streaming: ${errorMessage}`);
          setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
          streamEnded = true; break;
        }
        modelResponse += chunk;
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: modelResponse } : msg));
      }

      if (streamEnded && !error) {
        const finalModelMessage: Message = { id: modelMessageId, role: 'model', content: modelResponse, timestamp: Date.now() };
        setMessages(prev => {
          const finalMessages = prev.map(msg => msg.id === modelMessageId ? finalModelMessage : msg);
          saveChatSession(chatId, finalMessages);
          return finalMessages;
        });

      } else if (!streamEnded) {
        setError("The response stream ended unexpectedly.");
        setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
      }
    } catch (err: any) {
      console.error("Send Message Error:", err);
      setError(err.message || 'An unexpected error occurred.');
      if (!streamEnded) {
        setMessages(prev => prev.filter(msg => msg.role === 'user'));
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, messages, attachedFile, currentChatId, addRecentPrompt]);

  const handleDeletePrompt = (promptId: string) => {
    setRecentPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleSelectPrompt = (promptText: string) => {
    setInput(promptText);
  };

  const saveChatSession = async (chatId: string, finalMessages: Message[]) => {
    if (finalMessages.length === 0) return;

    const chatTitle = typeof finalMessages[0].content === 'string'
      ? finalMessages[0].content.substring(0, 255)
      : finalMessages[0].fileInfo?.name
      || "Untitled Chat";

    const sessionToSave: ChatSession = {
      id: chatId,
      title: chatTitle,
      messages: finalMessages,
      lastUpdated: Date.now(),
    };

    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionToSave),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save chat session');
      }
      const savedSession: ChatSession = await response.json();
      // Update client-side chat history
      setChatHistory(prev => {
        const existingIndex = prev.findIndex(c => c.id === savedSession.id);
        let updatedHistory;
        if (existingIndex > -1) {
          updatedHistory = prev.map(c => c.id === savedSession.id ? savedSession : c);
        } else {
          updatedHistory = [savedSession, ...prev];
        }
        return updatedHistory
          .sort((a, b) => b.lastUpdated - a.lastUpdated)
          .slice(0, 50); // Keep a larger buffer client-side, server enforces strict MAX_CHAT_HISTORY
      });

      if (!currentChatId) setCurrentChatId(savedSession.id);

    } catch (err: any) {
      console.error('Error saving chat session:', err);
      setError(`Failed to save chat: ${err.message}`);
    }
  };

  const startNewChat = (clearCurrentId: boolean = true) => {
    setMessages([]);
    setInput('');
    if (clearCurrentId) setCurrentChatId(uuidv4());
    setError(null);
    setIsLoading(false);
    setAttachedFile(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    console.log("Starting new chat session");
  };

  const handleLoadChat = (chatId: string) => {
    // Option 1: Find in existing client-side history (if up-to-date)
    const chatToLoad = chatHistory.find(c => c.id === chatId);
    if (chatToLoad) {
      setMessages(chatToLoad.messages);
      setCurrentChatId(chatToLoad.id);
      setInput('');
      setError(null);
      setIsLoading(false);
      setAttachedFile(null);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } else {
      // Option 2: Fetch from server if not found (or always fetch for consistency)
      // This part could be enhanced to fetch `/api/chat/history/[chatId]`
      console.warn(`Chat ${chatId} not found in local history. Consider fetching.`);
      setError("Chat not found. It might have been deleted or an error occurred.");
      // For now, just log. A full fetch would be:
      // async function fetchAndLoad() { try { const res = await fetch(...); ... } catch { ... } }
      // fetchAndLoad();
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/history/${chatId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete chat session');
      }
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) {
        startNewChat(true);
      }
    } catch (err: any) {
      console.error('Error deleting chat session:', err);
      setError(`Failed to delete chat: ${err.message}`);
    }
  };

  const handleDeleteMessage = (messageIdToDelete: string) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageIdToDelete);
    setMessages(updatedMessages);

    // If this is part of a saved chat (currentChatId exists),
    // or if it's a new chat that now becomes empty and we don't want to save it,
    // we need to update the persisted state.
    if (currentChatId || updatedMessages.length > 0) {
      // If currentChatId exists, or if it's a new chat but still has messages, save it.
      // If it's a new chat and becomes empty, saveChatSession will handle not saving it.
      if (currentChatId) saveChatSession(currentChatId, updatedMessages);
    } else if (!currentChatId && updatedMessages.length === 0) {
      // This was a new chat, and deleting the message made it empty.
      // No need to call saveChatSession as it would be skipped anyway.
      console.log("New chat became empty after message deletion. Not saving.");
    }
  };

  const handleAttachFile = (file: File) => {
    setAttachedFile({ file });
  };
  const handleRemoveFile = () => {
    setAttachedFile(null);
  };
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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

      <main className={`flex flex-col flex-1 h-full transition-all duration-300 ease-in-out`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white shadow-inner">
          {isHistoryLoading && messages.length === 0 && ( // Show loading indicator for initial history
            <div className="text-center py-10 text-gray-500">Loading chat history...</div>
          )}
          {!isHistoryLoading && chatHistory.length === 0 && messages.length === 0 && !currentChatId && (
            <div className="text-center py-10 text-gray-500">
              No chats yet. Start a new conversation!
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onDeleteMessage={handleDeleteMessage} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="p-3 rounded-lg shadow bg-gray-200 text-gray-500 italic">
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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