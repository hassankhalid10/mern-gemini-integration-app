import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:4000/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Auth state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Settings state (persisted in localStorage)
  const [tone, setTone] = useState(localStorage.getItem("tone") || "Neutral");
  const [maxTokens, setMaxTokens] = useState(parseInt(localStorage.getItem("maxTokens")) || 8192);
  const [showSettings, setShowSettings] = useState(false);

  // Multi-Turn AI state
  const [chatSessions, setChatSessions] = useState([]);      // Sidebar history list
  const [activeChatId, setActiveChatId] = useState(null);    // The currently loaded chat
  const [currentMessages, setCurrentMessages] = useState([]); // The messages in the active chat
  
  const [question, setQuestion] = useState("");

  // Message action state
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState(null);
  const [editingMsgIdx, setEditingMsgIdx] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [currentMessages, aiLoading]);

  // Auth Effect
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadChatsList();
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  // Auth Handling
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const endpoint = isLoginView ? "/auth/login" : "/auth/signup";
      const payload = isLoginView ? { email, password } : { name, email, password };
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      setToken(res.data.token);
    } catch (err) {
      setAuthError(err.response?.data?.msg || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Chat Data Loaders
  const loadChatsList = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/history`, {
        headers: { Authorization: token }
      });
      setChatSessions(res.data);
    } catch (err) {
      console.error("Could not load chats", err);
    }
  };

  const loadSpecificChat = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/ai/chat/${id}`, {
        headers: { Authorization: token }
      });
      setCurrentMessages(res.data.messages);
      setActiveChatId(id);
      setAiError("");
    } catch (err) {
      console.error("Could not load chat details", err);
    }
  };

  // Start a fresh, empty session
  const startNewChat = () => {
    setActiveChatId(null);
    setCurrentMessages([]);
    setAiError("");
  };

  // Asking a question (handles both fresh chats and ongoing chats)
  const askAI = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setAiLoading(true);
    setAiError("");
    
    // Optimistically render user message
    const tempQuestion = question;
    setCurrentMessages(prev => [...prev, { role: "user", content: tempQuestion }]);
    setQuestion(""); 
    
    try {
      const res = await axios.post(
        `${API_URL}/ai/ask`,
        { question: tempQuestion, chatId: activeChatId, tone, maxTokens },
        { headers: { Authorization: token } }
      );
      
      // Update UI with AI response
      setCurrentMessages(prev => [...prev, { role: "model", content: res.data.answer }]);
      
      // If it was a new chat, switch active ID to the new one and refresh sidebar
      if (!activeChatId) {
        setActiveChatId(res.data.chatId);
        loadChatsList();
      }
    } catch (err) {
      setAiError(err.response?.data?.msg || "Failed to get AI response");
      // Optionally pop the optimistic message if it failed, but leaving it as an error indicator is fine
    } finally {
      setAiLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setChatSessions([]);
    setCurrentMessages([]);
    setActiveChatId(null);
  };

  // Settings handlers
  const handleToneChange = (value) => {
    setTone(value);
    localStorage.setItem("tone", value);
  };

  const handleMaxTokensChange = (value) => {
    setMaxTokens(parseInt(value));
    localStorage.setItem("maxTokens", value);
  };

  // Message action handlers
  const handleCopy = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const regenerateAI = async () => {
    const prevMessages = currentMessages;
    setRegenLoading(true);
    setAiError("");
    try {
      const res = await axios.post(
        `${API_URL}/ai/regenerate`,
        { chatId: activeChatId, tone, maxTokens },
        { headers: { Authorization: token } }
      );
      setCurrentMessages(res.data.messages);
    } catch (err) {
      setCurrentMessages(prevMessages);
      setAiError(err.response?.data?.msg || "Failed to regenerate response");
    } finally {
      setRegenLoading(false);
    }
  };

  const editMessage = async (idx) => {
    if (!editContent.trim()) return;
    const prevMessages = currentMessages;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await axios.post(
        `${API_URL}/ai/edit`,
        { chatId: activeChatId, messageIndex: idx, newContent: editContent, tone, maxTokens },
        { headers: { Authorization: token } }
      );
      setCurrentMessages(res.data.messages);
      setEditingMsgIdx(null);
      setEditContent("");
    } catch (err) {
      setCurrentMessages(prevMessages);
      setAiError(err.response?.data?.msg || "Failed to edit message");
    } finally {
      setAiLoading(false);
    }
  };

  // ----- Views ----- //

  if (!token) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card">
          <div className="logo-section">
            <div className="ai-icon">AI</div>
            <h2>{isLoginView ? "Welcome Back" : "Create Account"}</h2>
          </div>
          {authError && <div className="error-banner">{authError}</div>}
          <form onSubmit={handleAuth}>
            {!isLoginView && (
              <div className="input-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="John Doe"
                  required 
                />
              </div>
            )}
            <div className="input-group">
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@example.com"
                required 
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
            <button type="submit" className="primary-btn" disabled={authLoading}>
              {authLoading ? <div className="spinner"></div> : isLoginView ? "Login" : "Sign Up"}
            </button>
          </form>
          <p className="toggle-text">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => {setIsLoginView(!isLoginView); setAuthError("");}}>
              {isLoginView ? "Sign up here" : "Login here"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar glass-card">
        <div className="sidebar-header">
          <div className="brand">
            <div className="ai-icon-small">AI</div>
            <h3>MERN Gemini</h3>
          </div>
          <button onClick={logout} className="logout-btn" title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
        
        <div className="sidebar-actions" style={{ padding: '15px' }}>
            <button onClick={startNewChat} className="primary-btn" style={{ width: '100%', fontSize: '14px', padding: '10px' }}>
                + New Chat
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="settings-btn">
              ⚙ Settings
            </button>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="settings-row">
              <label className="settings-label">Tone</label>
              <select value={tone} onChange={e => handleToneChange(e.target.value)}>
                <option>Neutral</option>
                <option>Professional</option>
                <option>Casual</option>
                <option>Creative</option>
                <option>Concise</option>
                <option>Angry</option>
                <option>Romantic</option>
              </select>
            </div>
            <div className="settings-row">
              <label className="settings-label">Max Tokens: <span>{maxTokens}</span></label>
              <input
                type="range"
                min="50"
                max="8192"
                step="1"
                value={maxTokens}
                onChange={e => handleMaxTokensChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="history-list">
          {chatSessions.length === 0 ? (
            <div className="empty-state">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
               <p>No chat sessions.</p>
            </div>
          ) : (
            chatSessions.map((chat) => (
              <div 
                key={chat._id} 
                className={`history-item ${activeChatId === chat._id ? 'active' : ''}`}
                onClick={() => loadSpecificChat(chat._id)}
              >
                <p className="history-q">{chat.title || "New Chat"}</p>
                <p className="history-a" style={{ fontSize: '11px' }}>
                    {new Date(chat.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>
      
      <main className="main-content">
        <div className="chat-window glass-card">
          <div className="chat-area">
            {currentMessages.length === 0 && !aiLoading && (
              <div className="welcome-chat">
                <div className="welcome-logo">✨</div>
                <h2>Hi there! 👋</h2>
                <p>Welcome to the MERN Gemini Integration App. Start a conversation.</p>
              </div>
            )}
            
            <div className="messages-flow">
              {(() => {
                const lastModelIdx = currentMessages.reduce((last, msg, idx) => msg.role === 'model' ? idx : last, -1);
                return currentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}${hoveredMsgIdx === idx && editingMsgIdx === null ? ' hovered' : ''}`}
                    onMouseEnter={() => { if (editingMsgIdx === null) setHoveredMsgIdx(idx); }}
                    onMouseLeave={() => setHoveredMsgIdx(null)}
                  >
                    {editingMsgIdx === idx ? (
                      <div className="edit-area">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            className="edit-save-btn"
                            disabled={!editContent.trim() || aiLoading}
                            onClick={() => editMessage(idx)}
                          >
                            {aiLoading ? '⏳' : 'Save & Submit'}
                          </button>
                          <button
                            className="edit-cancel-btn"
                            onClick={() => { setEditingMsgIdx(null); setEditContent(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`bubble ${msg.role === 'model' ? 'ai-bubble markdown-sim' : ''}`}>
                          {msg.content}
                        </div>
                        <div className="msg-action-bar">
                          {msg.role === 'model' && (
                            <button
                              title="Copy"
                              disabled={aiLoading || regenLoading || editingMsgIdx !== null}
                              onClick={() => handleCopy(msg.content, idx)}
                            >
                              {copiedMsgIdx === idx ? '✓' : '📋'}
                            </button>
                          )}
                          {msg.role === 'model' && idx === lastModelIdx && (
                            <button
                              title="Regenerate"
                              disabled={aiLoading || editingMsgIdx !== null}
                              onClick={regenerateAI}
                            >
                              {regenLoading ? '⏳' : '🔁'}
                            </button>
                          )}
                          {msg.role === 'user' && (
                            <button
                              title="Edit"
                              disabled={aiLoading || regenLoading}
                              onClick={() => { setEditingMsgIdx(idx); setEditContent(msg.content); }}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ));
              })()}
              
              {aiLoading && (
                <div className="message ai-msg">
                  <div className="bubble ai-bubble loading-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {aiError && (
              <div className="error-banner chat-error">{aiError}</div>
            )}
          </div>
          <form className="input-area" onSubmit={askAI}>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Message Gemini..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={aiLoading}
              />
              <button type="submit" disabled={!question.trim() || aiLoading} className="ask-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
