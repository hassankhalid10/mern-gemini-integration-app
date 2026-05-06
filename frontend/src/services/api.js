const API_BASE_URL = "http://localhost:4000/api";

const getHeaders = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
});

export const authAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  signup: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
};

export const chatAPI = {
  getHistory: async (token) => {
    const res = await fetch(`${API_BASE_URL}/ai/history`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  getChatDetails: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  ask: async (token, payload) => {
    const res = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  regenerate: async (token, chatId, tone, maxTokens) => {
    const res = await fetch(`${API_BASE_URL}/ai/regenerate`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ chatId, tone, maxTokens }),
    });
    return res.json();
  },
  editMessage: async (token, chatId, messageIndex, newContent, tone, maxTokens) => {
    const res = await fetch(`${API_BASE_URL}/ai/edit`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ chatId, messageIndex, newContent, tone, maxTokens }),
    });
    return res.json();
  },
  pinSession: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}/pin`, {
      method: "PATCH",
      headers: getHeaders(token),
    });
    return res.json();
  },
  renameSession: async (token, chatId, title) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}/rename`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({ title }),
    });
    return res.json();
  },
  deleteSession: async (token, chatId) => {
    const res = await fetch(`${API_BASE_URL}/ai/chat/${chatId}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });
    return res.json();
  },
};

export const memoryAPI = {
  getMemory: async (token) => {
    const res = await fetch(`${API_BASE_URL}/memory`, {
      headers: getHeaders(token),
    });
    return res.json();
  },
  addMemory: async (token, category, data) => {
    const res = await fetch(`${API_BASE_URL}/memory`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({ [category]: data }),
    });
    return res.json();
  },
  deleteMemory: async (token, category, key) => {
    const res = await fetch(`${API_BASE_URL}/memory/${category}/${key}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });
    return res.json();
  },
};
