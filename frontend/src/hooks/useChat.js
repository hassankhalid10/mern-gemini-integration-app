/**
 * Chat Hook
 * 
 * This is the "Brain" of the chat interface. It handles all the actions
 * like starting a new chat, sending a question, pinning a conversation,
 * and deleting old chats. It also keeps track of all your past sessions.
 */

import { useState, useCallback } from "react";

import { chatAPI } from "../services/api";

export const useChat = (token) => {
  // --- State Management ---
  // These variables keep track of everything happening in the chat interface.

  // Holds the list of all your past chat sessions (titles, IDs, etc.)
  const [chatSessions, setChatSessions] = useState([]);
  
  // Keeps track of which chat is currently open on the screen
  const [activeChatId, setActiveChatId] = useState(null);
  
  // The actual list of messages (yours and the AI's) for the current chat
  const [currentMessages, setCurrentMessages] = useState([]);
  
  // A "True/False" switch that turns on when the AI is busy typing its first response
  const [aiLoading, setAiLoading] = useState(false);
  
  // A switch that turns on when you ask the AI to rewrite (regenerate) its last answer
  const [regenLoading, setRegenLoading] = useState(false);
  
  // Stores any error messages if something goes wrong with the AI
  const [aiError, setAiError] = useState("");
  
  // Stores error messages specifically for the sidebar (like pinning limits)
  const [sidebarError, setSidebarError] = useState("");


  /**
   * Fetches the full list of your chats from the server.
   * This is used to populate the sidebar.
   */
  const loadChatsList = useCallback(async () => {
    if (!token) return; // Can't fetch if we aren't logged in
    try {
      const data = await chatAPI.getHistory(token);
      setChatSessions(data); // Save the list to our 'chatSessions' state
    } catch (err) {
      console.error("Could not load chats", err);
    }
  }, [token]);


  /**
   * Opens a specific chat when you click it in the sidebar.
   * It fetches all the messages belonging to that chat ID.
   */
  const loadSpecificChat = useCallback(async (id) => {
    try {
      const data = await chatAPI.getChatDetails(token, id);
      setCurrentMessages(data.messages); // Show the messages on the screen
      setActiveChatId(id); // Remember which chat is active
      setAiError(""); // Clear any old errors
    } catch (err) {
      console.error("Could not load chat details", err);
    }
  }, [token]);


  /**
   * Resets the screen so you can start a fresh conversation.
   * It clears the current messages and the active chat ID.
   */
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setCurrentMessages([]);
    setAiError("");
  }, []);


  /**
   * Sends your question to the AI.
   * It immediately adds your message to the screen, then waits for the AI.
   */
  const askAI = async (question, selectedFile, tone, maxTokens, clearFile) => {
    if (!question.trim()) return; // Don't send empty messages
    setAiLoading(true); // Show the "typing" dots
    setAiError("");
    
    const tempQuestion = question;
    const tempFile = selectedFile;
    
    // 1. Add your message to the list right away so it feels fast
    setCurrentMessages(prev => [...prev, { 
      role: "user", 
      content: tempQuestion, 
      file: tempFile 
    }]);
    
    if (clearFile) clearFile(); // Clear the text box

    try {
      // 2. Ask the server for an answer
      const data = await chatAPI.ask(token, { 
        question: tempQuestion, 
        chatId: activeChatId, 
        tone, 
        maxTokens, 
        fileData: tempFile 
      });
      
      // 3. Add the AI's answer to the list
      setCurrentMessages(prev => [...prev, { role: "model", content: data.answer }]);
      
      // 4. If this was a brand new chat, remember the ID the server gave us
      if (!activeChatId) {
        setActiveChatId(data.chatId);
        loadChatsList(); // Refresh sidebar to show the new chat title
      }
    } catch (err) {
      setAiError("Failed to get AI response");
    } finally {
      setAiLoading(false); // Stop showing the "typing" dots
    }
  };


  /**
   * Tells the AI to try answering the last question again.
   * It swaps the old answer with a brand new one.
   */
  const regenerateAI = async (tone, maxTokens) => {
    if (!activeChatId) return;
    const prevMessages = currentMessages;
    setRegenLoading(true); // Show loading only for this specific message
    setAiError("");
    try {
      const data = await chatAPI.regenerate(token, activeChatId, tone, maxTokens);
      setCurrentMessages(data.messages); // Update the whole list with the new answer
    } catch (err) {
      setCurrentMessages(prevMessages); // Put the old messages back if it failed
      setAiError("Failed to regenerate response");
    } finally {
      setRegenLoading(false);
    }
  };


  /**
   * Updates a message you sent earlier and gets a fresh AI response from that point.
   */
  const editMessage = async (idx, content, tone, maxTokens) => {
    if (!content.trim() || !activeChatId) return;
    const prevMessages = currentMessages;
    setAiLoading(true);
    setAiError("");
    try {
      const data = await chatAPI.editMessage(token, activeChatId, idx, content, tone, maxTokens);
      setCurrentMessages(data.messages); // Show the new branch of the conversation
      return true;
    } catch (err) {
      setCurrentMessages(prevMessages);
      setAiError("Failed to edit message");
      return false;
    } finally {
      setAiLoading(false);
    }
  };


  /**
   * Pins a chat to the top of the sidebar.
   * Includes a safety check to make sure you don't pin more than 3 chats.
   */
  const togglePin = async (id, e) => {
    if (e) e.stopPropagation(); // Prevents clicking the pin from also 'opening' the chat
    
    const chatToToggle = chatSessions.find(c => c._id === id);
    const pinnedCount = chatSessions.filter(c => c.isPinned).length;

    // Check if we are trying to pin a 4th chat
    if (chatToToggle && !chatToToggle.isPinned && pinnedCount >= 3) {
      setSidebarError("Maximum limit reached: You can only pin up to 3 chats.");
      setTimeout(() => setSidebarError(""), 4000); // Hide error after 4 seconds
      return;
    }

    try {
      await chatAPI.pinSession(token, id);
      loadChatsList(); // Refresh the list to show the new pinned order
    } catch (err) {
      console.error("Pin failed", err);
    }
  };


  /**
   * Changes the name of a chat session.
   */
  const renameChat = async (id, title) => {
    if (!title.trim()) return;
    try {
      await chatAPI.renameSession(token, id, title);
      loadChatsList(); // Update sidebar with the new name
      return true;
    } catch (err) {
      console.error("Rename failed", err);
      return false;
    }
  };


  /**
   * Deletes a chat session permanently.
   */
  const deleteChat = async (id, e) => {
    if (e) e.stopPropagation(); // Prevents opening the chat while deleting it
    try {
      await chatAPI.deleteSession(token, id);
      
      // If we just deleted the chat that was open, clear the screen
      if (activeChatId === id) {
        startNewChat();
      }
      loadChatsList(); // Update sidebar to remove the deleted chat
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
