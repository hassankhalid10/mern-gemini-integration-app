/**
 * API Service
 * 
 * This file is like the "Phone" that the website uses to call the backend 
 * server. It contains all the functions for logging in, sending chat 
 * messages, and updating your preferences.
 */

const API_BASE_URL = "http://localhost:4000/api";


/**
 * Helper function to create the "Headers" for our requests.
 * It sets the data type to JSON and attaches your "ID card" (token) 
 * so the server knows who you are.
 */
const getHeaders = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
});


/**
 * Functions for security, like logging in or signing up.
 */
export const authAPI = {
  // Sends your email and password to the server to get a login token
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST", // POST means we are "sending" data
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  // Creates a brand new account for you
  signup: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
};


/**
 * Functions for all things chat-related (getting history, asking questions, etc.).
 */
export const chatAPI = {
  // Gets the list of titles for all your past chats
  getHistory: async (token) => {
    const res = await fetch(`${API_BASE_URL}/ai/history`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  // Gets the actual messages for one specific chat
  getChatDetails: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  // Sends a question to the AI
  ask: async (token, payload) => {
    const res = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  // Asks the AI to rewrite its last answer
  regenerate: async (token, chatId, tone, maxTokens) => {
    const res = await fetch(`${API_BASE_URL}/ai/regenerate`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ chatId, tone, maxTokens }),
    });
    return res.json();
  },
  // Updates a previous message and gets a new response
  editMessage: async (token, chatId, messageIndex, newContent, tone, maxTokens) => {
    const res = await fetch(`${API_BASE_URL}/ai/edit`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ chatId, messageIndex, newContent, tone, maxTokens }),
    });
    return res.json();
  },
  // Pins a chat to the top of the list
  pinSession: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}/pin`, {
      method: "PATCH", // PATCH means we are "updating" a piece of data
      headers: getHeaders(token),
    });
    return res.json();
  },
  // Changes the title of a chat
  renameSession: async (token, chatId, title) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}/rename`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({ title }),
    });
    return res.json();
  },
  // Deletes a chat forever
  deleteSession: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}`, {
      method: "DELETE", // DELETE means we are "removing" data
      headers: getHeaders(token),
    });
    return res.json();
  },
};


/**
 * Functions for managing what the AI remembers about you.
 */
export const memoryAPI = {
  // Gets all your profile info, preferences, and goals
  getMemory: async (token) => {
    const res = await fetch(`${API_BASE_URL}/memory`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  // Adds a new fact to the AI's memory
  addMemory: async (token, category, data) => {
    const res = await fetch(`${API_BASE_URL}/memory`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({ [category]: data }),
    });
    return res.json();
  },
  // Removes a specific fact from memory
  deleteMemory: async (token, category, key) => {
    const res = await fetch(`${API_BASE_URL}/memory/${category}/${key}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });
    return res.json();
  },
};

