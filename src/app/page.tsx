'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Part, AppConfig } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message, ChatSession, RecentPrompt, ApiFileData, AttachedFile } from '@/lib/types';
import { prepareFilesDataForApi, fileToBase64 } from '@/utils/fileHelper';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const attachedFilesExist = attachedFiles.length > 0 ? true : false;
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  const [recentPrompts, setRecentPrompts] = useState<RecentPrompt[]>([]);
  const [isRecentPromptsLoading, setIsRecentPromptsLoading] = useState(true);

  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isNewChatAdded, setIsNewChatAdded] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializePage = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch config" }));
        throw new Error(errorData.error || `Failed to fetch chat config: ${response.statusText}`);
      }
      const appConfig: AppConfig = await response.json();
      setAppConfig(appConfig);
    } catch (err: unknown) {
      console.error('Error fetching config:', err);
      setError(`Could not load chat history: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  /**
   * Fetch Initial Recent Prompts
   */
  const fetchRecentPrompts = useCallback(async () => {
    setIsRecentPromptsLoading(true);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch prompts" }));
        throw new Error(errorData.error || `Failed to fetch recent prompts: ${response.statusText}`);
      }
      const data: RecentPrompt[] = await response.json();
      setRecentPrompts(data);
    } catch (err: unknown) {
      console.error('Error fetching recent prompts:', err);
      // setError(`Could not load recent prompts: ${err instanceof Error ? err.message : String(err)}`); // Optional: show error
      setRecentPrompts([]); // Default to empty on error
    } finally {
      setIsRecentPromptsLoading(false);
    }
  }, []);
  /**
   * Fetch Initial Chat History
   */
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
      if (data.length === 0 && !currentChatId) {
        startNewChat(false); // Start a new chat session if history is empty, don't clear if already new
      }
    } catch (err: unknown) {
      console.error('Error fetching chat history:', err);
      setError(`Could not load chat history: ${err instanceof Error ? err.message : String(err)}`);
      setChatHistory([]);
      startNewChat(false);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [isNewChatAdded]);

  const reloadPage = () => {
    const checkScreenSize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
  };

  useEffect(() => {
    fetchChatHistory();
    reloadPage();
  }, [fetchChatHistory]);

  useEffect(() => {
    fetchRecentPrompts();
    reloadPage();
  }, [fetchRecentPrompts]);

  useEffect(() => {
    initializePage();
    reloadPage();
  }, [initializePage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Add Prompts.
   */
  const addRecentPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim()) return;
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText.trim() }),
      });
      if (!response.ok) {
        // Optionally handle error, e.g., log it or show a subtle notification
        console.error('Failed to add recent prompt:', await response.text());
        return; // Don't proceed if adding failed
      }
      // const newPrompt = await response.json(); // The API returns the added prompt
      // Optimistically update or re-fetch
      // For simplicity, re-fetch. For better UX, optimistic update.
      fetchRecentPrompts();
    } catch (err) {
      console.error('Error in addRecentPrompt:', err);
    }
  }, [fetchRecentPrompts]);

  /**
   *  Core Chat Logic (handleSendMessage).
   **/
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachedFilesExist && !audioBlob) return;

    setIsLoading(true);
    setError(null);

    const chatId = currentChatId ?? uuidv4();
    const userMessageId = uuidv4();
    // let fileDataForApi: ApiFileData | null = null;
    const userMessageContent: Part[] = [];
    let textPart: Part | null = null;
    let voicePart: Part | null = null;
    let filesForAPI: ApiFileData[] = [];
    let voiceDataForApi: ApiFileData | null = null;

    if (trimmedInput) {
      textPart = { text: trimmedInput };
      userMessageContent.push(textPart);
    }

    if (audioBlob) {
      const base64VoiceData = await fileToBase64(audioBlob as File);

      if (!trimmedInput) {
        textPart = { text: "Use audio prompt" };
        userMessageContent.push(textPart);
      }

      // Construct voicePart
      voicePart = {
        inlineData:
        {
          mimeType: "audio/webm",
          data: base64VoiceData,
        }
      };
      userMessageContent.push(voicePart);
      voiceDataForApi = {
        mimeType: voicePart.inlineData.mimeType,
        base64Data: base64VoiceData,
        name: `Audio prompt ${uuidv4()}`,
      };
    }

    if (attachedFilesExist) {
      filesForAPI = await prepareFilesDataForApi(attachedFiles, appConfig);
      filesForAPI.forEach((f) => {
        userMessageContent.push(
          {
            inlineData:
            {
              mimeType: f.mimeType,
              data: f.base64Data,
            }
          }
        );
      });

    }

    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      fileInfos: attachedFiles.map((f) => ({
        name: f.file.name,
        type: f.file.type,
      })),
      ...(voiceDataForApi && {
        voicePrompt: {
          name: voiceDataForApi.name,
          data: voiceDataForApi.base64Data,
          type: voiceDataForApi.mimeType,
        }
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (trimmedInput) {
      addRecentPrompt(trimmedInput);
    }
    setInput("");
    setAttachedFiles([]);

    const apiHistory = messages.map(msg => ({
      role: msg.role,
      parts: typeof msg.content === 'string' ? [{ text: msg.content }] : msg.content
    }));

    let streamEnded = false;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          {
            prompt: trimmedInput,
            voicePrompt: voiceDataForApi,
            history: apiHistory,
            filesData: filesForAPI,
          }),
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
      setMessages(prev => [...prev, {
        id: modelMessageId,
        role: 'model',
        content: [{ text: '...' }],
        timestamp: Date.now()
      }]);

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
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: [{ text: modelResponse }] } : msg));
      }

      if (streamEnded && !error) {
        const finalModelMessage: Message = {
          id: modelMessageId,
          role: 'model',
          content: [{ text: modelResponse }],
          timestamp: Date.now()
        };

        const finalMessages = [...messages, userMessage, finalModelMessage];
        saveChatSession(chatId, finalMessages);
        setMessages(finalMessages);
        setIsNewChatAdded(false);
      } else if (!streamEnded) {
        setError("The response stream ended unexpectedly.");
        setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
      }
    } catch (err: unknown) {
      console.error("Send Message Error:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      if (!streamEnded) {
        setMessages(prev => prev.filter(msg => msg.role === 'user'));
      }
    } finally {
      setIsLoading(false);
      handleVoicePrompt(null);
    }
  }, [input, audioBlob, messages, attachedFiles, currentChatId, addRecentPrompt]);

  const handleDeletePrompt = useCallback(async (promptIdOrText: string) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptIdOrText }),
      });
      if (!response.ok) {
        console.error('Failed to delete recent prompt:', await response.text());
        return;
      }
      // Re-fetch to update the list
      fetchRecentPrompts();
    } catch (err) {
      console.error('Error in handleDeletePrompt:', err);
    }
  }, [fetchRecentPrompts]); // Depends on fetchRecentPrompts

  const handleSelectPrompt = (promptText: string) => {
    setInput(promptText);
  };

  const handleVoicePrompt = (auBlob: Blob | null) => {
    setAudioBlob(auBlob);
  };

  const saveChatSession = async (chatId: string, finalMessages: Message[]) => {
    if (finalMessages.length === 0) return;
    const chatTitle = (Array.isArray(finalMessages[0].content) && finalMessages[0].content[0]
      && typeof finalMessages[0].content[0] === 'object'
      && 'text' in finalMessages[0].content[0]) ? ((finalMessages[0].content[0] as Part).text ?? "").substring(0, 255)
      : finalMessages[0].voicePrompt ? finalMessages[0].voicePrompt.name
        : finalMessages[0].fileInfos && finalMessages[0].fileInfos[0] ? finalMessages[0].fileInfos[0].name
          : "Untitled Chat";

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
    } catch (err: unknown) {
      console.error('Error saving chat session:', err);
      setError(`Failed to save chat: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const startNewChat = (clearCurrentId: boolean = true) => {
    setMessages([]);
    setInput("");
    setIsNewChatAdded(true);
    if (clearCurrentId) {
      setCurrentChatId(uuidv4());
    }
    setAudioBlob(null);
    setError(null);
    setIsLoading(false);
    setAttachedFiles([]);
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
      setAttachedFiles([]);
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
    } catch (err: unknown) {
      console.error('Error deleting chat session:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete chat: ${errorMessage}`);
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

  const handleAttachFile = (attachedFile: AttachedFile) => {
    setAttachedFiles([...attachedFiles, attachedFile]);
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(attachedFiles.filter(v => v.id !== id));
  };
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        recentPrompts={recentPrompts} // Pass down the state
        isRecentPromptsLoading={isRecentPromptsLoading} // Pass loading state
        chatHistory={chatHistory}
        isChatHistoryLoading={isHistoryLoading} // Pass chat history loading state
        currentChatId={currentChatId}
        isSidebarOpen={isSidebarOpen}
        onNewChat={() => startNewChat(true)}
        onDeletePrompt={handleDeletePrompt} // Pass the new handler
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
          onVoicePrompt={handleVoicePrompt}
          isLoading={isLoading}
          attachedFiles={attachedFiles}
          auBlob={audioBlob}
          appConfig={appConfig}
        />
      </main>
    </div>
  );
}