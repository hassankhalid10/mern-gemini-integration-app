import { useState, useCallback } from "react";
import { chatAPI } from "../services/api";

export const useChat = (token) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sidebarError, setSidebarError] = useState("");

  const loadChatsList = useCallback(async () => {
    if (!token) return;
    try {
      const data = await chatAPI.getHistory(token);
      setChatSessions(data);
    } catch (err) {
      console.error("Could not load chats", err);
    }
  }, [token]);

  const loadSpecificChat = useCallback(async (id) => {
    try {
      const data = await chatAPI.getChatDetails(token, id);
      setCurrentMessages(data.messages);
      setActiveChatId(id);
      setAiError("");
    } catch (err) {
      console.error("Could not load chat details", err);
    }
  }, [token]);

  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setCurrentMessages([]);
    setAiError("");
  }, []);

  const askAI = async (question, selectedFile, tone, maxTokens, clearFile) => {
    if (!question.trim()) return;
    setAiLoading(true);
    setAiError("");
    
    const tempQuestion = question;
    const tempFile = selectedFile;
    
    setCurrentMessages(prev => [...prev, { 
      role: "user", 
      content: tempQuestion, 
      file: tempFile 
    }]);
    
    if (clearFile) clearFile();

    try {
      const data = await chatAPI.ask(token, { 
        question: tempQuestion, 
        chatId: activeChatId, 
        tone, 
        maxTokens, 
        fileData: tempFile 
      });
      
      setCurrentMessages(prev => [...prev, { role: "model", content: data.answer }]);
      
      if (!activeChatId) {
        setActiveChatId(data.chatId);
        loadChatsList();
      }
    } catch (err) {
      setAiError("Failed to get AI response");
    } finally {
      setAiLoading(false);
    }
  };

  const regenerateAI = async (tone, maxTokens) => {
    if (!activeChatId) return;
    const prevMessages = currentMessages;
    setRegenLoading(true);
    setAiError("");
    try {
      const data = await chatAPI.regenerate(token, activeChatId, tone, maxTokens);
      setCurrentMessages(data.messages);
    } catch (err) {
      setCurrentMessages(prevMessages);
      setAiError("Failed to regenerate response");
    } finally {
      setRegenLoading(false);
    }
  };

  const editMessage = async (idx, content, tone, maxTokens) => {
    if (!content.trim() || !activeChatId) return;
    const prevMessages = currentMessages;
    setAiLoading(true);
    setAiError("");
    try {
      const data = await chatAPI.editMessage(token, activeChatId, idx, content, tone, maxTokens);
      setCurrentMessages(data.messages);
      return true;
    } catch (err) {
      setCurrentMessages(prevMessages);
      setAiError("Failed to edit message");
      return false;
    } finally {
      setAiLoading(false);
    }
  };

  const togglePin = async (id, e) => {
    if (e) e.stopPropagation();
    const chatToToggle = chatSessions.find(c => c._id === id);
    const pinnedCount = chatSessions.filter(c => c.isPinned).length;

    if (chatToToggle && !chatToToggle.isPinned && pinnedCount >= 3) {
      setSidebarError("Maximum limit reached: You can only pin up to 3 chats.");
      setTimeout(() => setSidebarError(""), 4000);
      return;
    }

    try {
      await chatAPI.pinSession(token, id);
      loadChatsList();
    } catch (err) {
      console.error("Pin failed", err);
    }
  };

  const renameChat = async (id, title) => {
    if (!title.trim()) return;
    try {
      await chatAPI.renameSession(token, id, title);
      loadChatsList();
      return true;
    } catch (err) {
      console.error("Rename failed", err);
      return false;
    }
  };

  const deleteChat = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await chatAPI.deleteSession(token, id);
      if (activeChatId === id) {
        startNewChat();
      }
      loadChatsList();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return {
    chatSessions,
    activeChatId,
    currentMessages,
    aiLoading,
    regenLoading,
    aiError,
    sidebarError,
    loadChatsList,
    loadSpecificChat,
    startNewChat,
    askAI,
    regenerateAI,
    editMessage,
    togglePin,
    renameChat,
    deleteChat,
    setCurrentMessages,
    setActiveChatId,
    setAiError
  };
};
