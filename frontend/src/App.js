import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Pin, Trash2, Edit3, Check, X, Copy, RotateCcw, Send, LogOut, Settings, Brain, Plus, Mic, Volume2, VolumeX, Paperclip, Play, Square } from 'lucide-react';
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

  // Sidebar action state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [sidebarError, setSidebarError] = useState("");

  // Memory state
  const [memory, setMemory] = useState({ profile: {}, preferences: {}, goals: [] });
  const [showMemory, setShowMemory] = useState(false);
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemVal, setNewMemVal] = useState("");
  const [newMemCat, setNewMemCat] = useState("profile");
  
  // Voice Interaction state
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const recognitionRef = useRef(null);
  
  // Multimodal state
  const [selectedFile, setSelectedFile] = useState(null); // { mimeType, data, fileName }
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Code Execution state
  const [pyodide, setPyodide] = useState(null);
  const [execResults, setExecResults] = useState({}); // Stores output of code blocks
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [currentMessages, aiLoading]);

  // Initialize Pyodide
  useEffect(() => {
    async function initPyodide() {
      if (window.loadPyodide) {
        try {
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/npm/pyodide@0.26.1/"
          });
          setPyodide(py);
          console.log("Pyodide Loaded");
        } catch (err) {
          console.error("Pyodide failed to load", err);
        }
      }
    }
    initPyodide();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setQuestion(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setSelectedFile({
        mimeType: file.type,
        data: base64Data,
        fileName: file.name
      });
      setFilePreview(file.type.startsWith('image/') ? reader.result : 'file');
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const speakText = (text, idx) => {
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const runPythonCode = async (code, blockId) => {
    if (!pyodide) return;
    
    setExecResults(prev => ({ ...prev, [blockId]: { loading: true, output: "" } }));
    
    try {
      // Redirect stdout to capture print statements
      await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.String()
      `);
      
      await pyodide.runPythonAsync(code);
      
      const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      setExecResults(prev => ({ ...prev, [blockId]: { loading: false, output: stdout || "Execution successful (no output)" } }));
    } catch (err) {
      setExecResults(prev => ({ ...prev, [blockId]: { loading: false, output: `Error: ${err.message}` } }));
    }
  };

  // Auth Effect
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadChatsList();
      fetchMemory();
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
    const tempFile = selectedFile;
    setCurrentMessages(prev => [...prev, { 
      role: "user", 
      content: tempQuestion, 
      file: tempFile 
    }]);
    setQuestion(""); 
    clearFile();
    
    try {
      const res = await axios.post(
        `${API_URL}/ai/ask`,
        { question: tempQuestion, chatId: activeChatId, tone, maxTokens, fileData: tempFile },
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

  const togglePin = async (id, e) => {
    e.stopPropagation();
    const chatToToggle = chatSessions.find(c => c._id === id);
    const pinnedCount = chatSessions.filter(c => c.isPinned).length;

    // If trying to pin a new chat and already at limit
    if (chatToToggle && !chatToToggle.isPinned && pinnedCount >= 3) {
      setSidebarError("Maximum limit reached: You can only pin up to 3 chats for quick access.");
      setTimeout(() => setSidebarError(""), 4000);
      return;
    }

    try {
      await axios.patch(`${API_URL}/ai/chat/${id}/pin`, {}, {
        headers: { Authorization: token }
      });
      loadChatsList();
    } catch (err) {
      console.error("Pin failed", err);
    }
  };

  const renameChat = async (id) => {
    if (!renameValue.trim()) return;
    try {
      await axios.patch(`${API_URL}/ai/chat/${id}/rename`, { title: renameValue }, {
        headers: { Authorization: token }
      });
      setRenamingId(null);
      setRenameValue("");
      loadChatsList();
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const deleteChat = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/ai/chat/${id}`, {
        headers: { Authorization: token }
      });
      if (activeChatId === id) {
        startNewChat();
      }
      setDeleteConfirmId(null);
      loadChatsList();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await axios.get(`${API_URL}/memory`, {
        headers: { Authorization: token }
      });
      setMemory(res.data);
    } catch (err) {
      console.error("Fetch memory failed", err);
    }
  };

  const updateMemory = async () => {
    if (!newMemVal.trim()) return;
    try {
      let payload = {};
      if (newMemCat === "goals") {
        payload.goals = [...memory.goals, newMemVal];
      } else {
        payload[newMemCat] = { [newMemKey]: newMemVal };
      }

      const res = await axios.patch(`${API_URL}/memory`, payload, {
        headers: { Authorization: token }
      });
      setMemory(res.data);
      setNewMemKey("");
      setNewMemVal("");
    } catch (err) {
      console.error("Update memory failed", err);
    }
  };

  const removeMemory = async (category, key) => {
    try {
      const res = await axios.delete(`${API_URL}/memory/${category}/${key}`, {
        headers: { Authorization: token }
      });
      setMemory(res.data);
    } catch (err) {
      console.error("Delete memory failed", err);
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
              <Settings size={14} style={{ marginRight: '8px' }} /> Settings
            </button>
            <button onClick={() => setShowMemory(true)} className="settings-btn memory-trigger-btn">
              <Brain size={14} style={{ marginRight: '8px' }} /> Memory Manager
            </button>
            {sidebarError && (
              <div className="sidebar-error-msg">
                {sidebarError}
              </div>
            )}
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
                className={`history-item ${activeChatId === chat._id ? 'active' : ''} ${chat.isPinned ? 'pinned' : ''}`}
                onClick={() => loadSpecificChat(chat._id)}
              >
                <div className="history-info">
                  {renamingId === chat._id ? (
                    <div className="rename-input-wrapper" onClick={e => e.stopPropagation()}>
                      <input 
                        value={renameValue} 
                        onChange={e => setRenameValue(e.target.value)}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && renameChat(chat._id)}
                      />
                      <button onClick={() => renameChat(chat._id)}><Check size={14} /></button>
                      <button onClick={() => setRenamingId(null)}><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <p className="history-q">{chat.title || "New Chat"}</p>
                      <p className="history-a">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
                
                <div className="history-actions">
                  <button 
                    className={`action-btn pin-btn ${chat.isPinned ? 'active' : ''}`} 
                    onClick={(e) => togglePin(chat._id, e)}
                    title={chat.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={14} fill={chat.isPinned ? "currentColor" : "none"} />
                  </button>
                  <button 
                    className="action-btn" 
                    onClick={(e) => { e.stopPropagation(); setRenamingId(chat._id); setRenameValue(chat.title); }}
                    title="Rename"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="action-btn delete-btn" 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(chat._id); }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {deleteConfirmId === chat._id && (
                  <div className="delete-confirm-overlay" onClick={e => e.stopPropagation()}>
                    <div className="delete-confirm-modal">
                      <p>Delete this chat?</p>
                      <div className="confirm-btns">
                        <button className="confirm-yes" onClick={() => deleteChat(chat._id)}>Yes</button>
                        <button className="confirm-no" onClick={() => setDeleteConfirmId(null)}>No</button>
                      </div>
                    </div>
                  </div>
                )}
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
                        <div className={`bubble ${msg.role === 'model' ? 'ai-bubble' : ''}`}>
                          {msg.role === 'model' ? (
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeContent = String(children).replace(/\n$/, '');
                                    const isPython = match && match[1] === 'python';
                                    const blockId = `code-${idx}-${codeContent.substring(0, 20)}`;

                                    return !inline && match ? (
                                      <div className="code-block-wrapper">
                                        <div className="code-header">
                                          <span>{match[1]}</span>
                                          {isPython && (
                                            <button 
                                              className="run-code-btn" 
                                              onClick={() => runPythonCode(codeContent, blockId)}
                                              disabled={!pyodide || execResults[blockId]?.loading}
                                            >
                                              {execResults[blockId]?.loading ? 'Running...' : 'Run Code'}
                                            </button>
                                          )}
                                        </div>
                                        <SyntaxHighlighter
                                          children={codeContent}
                                          style={tomorrow}
                                          language={match[1]}
                                          PreTag="div"
                                          {...props}
                                        />
                                        {execResults[blockId] && (
                                          <div className="code-output">
                                            <strong>Output:</strong>
                                            <pre>{execResults[blockId].output}</pre>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    )
                                  }
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                          ) : (
                            msg.content
                          )}
                          {msg.file && msg.file.data && (
                            <div className="msg-file-attachment">
                              {msg.file.mimeType.startsWith('image/') ? (
                                <img src={`data:${msg.file.mimeType};base64,${msg.file.data}`} alt="attachment" />
                              ) : (
                                <div className="file-doc-link">
                                  📄 {msg.file.fileName || 'Document'}
                                </div>
                              )}
                            </div>
                          )}
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
                          {msg.role === 'model' && (
                            <button
                              className="speaker-btn"
                              title={speakingIdx === idx ? "Stop" : "Listen"}
                              onClick={() => speakText(msg.content, idx)}
                            >
                              {speakingIdx === idx ? <VolumeX size={14} /> : <Volume2 size={14} />}
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

          {showMemory && (
            <div className="memory-overlay" onClick={() => setShowMemory(false)}>
              <div className="memory-modal glass-card" onClick={e => e.stopPropagation()}>
                <div className="memory-header">
                  <h3><Brain size={20} /> AI Memory Manager</h3>
                  <button className="close-btn" onClick={() => setShowMemory(false)}><X size={20} /></button>
                </div>
                
                <div className="memory-body">
                  <div className="memory-section">
                    <h4>Add New Memory</h4>
                    <div className="memory-add-form">
                      <select value={newMemCat} onChange={e => setNewMemCat(e.target.value)}>
                        <option value="profile">Profile (Facts)</option>
                        <option value="preferences">Preferences</option>
                        <option value="goals">Goals</option>
                      </select>
                      {newMemCat !== "goals" && (
                        <input 
                          placeholder="Key (e.g. Location)" 
                          value={newMemKey}
                          onChange={e => setNewMemKey(e.target.value)}
                        />
                      )}
                      <input 
                        placeholder={newMemCat === "goals" ? "Goal (e.g. Learn React)" : "Value"} 
                        value={newMemVal}
                        onChange={e => setNewMemVal(e.target.value)}
                      />
                      <button onClick={updateMemory} className="primary-btn add-mem-btn">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="memory-grid">
                    <div className="memory-card">
                      <h5>Profile</h5>
                      {Object.entries(memory.profile).map(([k, v]) => (
                        <div key={k} className="mem-item">
                          <span><strong>{k}:</strong> {v}</span>
                          <button onClick={() => removeMemory("profile", k)}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="memory-card">
                      <h5>Preferences</h5>
                      {Object.entries(memory.preferences).map(([k, v]) => (
                        <div key={k} className="mem-item">
                          <span><strong>{k}:</strong> {v}</span>
                          <button onClick={() => removeMemory("preferences", k)}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="memory-card">
                      <h5>Goals</h5>
                      <div className="goals-tags">
                        {memory.goals.map(g => (
                          <div key={g} className="goal-tag">
                            {g}
                            <button onClick={() => removeMemory("goals", g)}><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form className="input-area" onSubmit={askAI}>
            {filePreview && (
              <div className="file-preview-bar">
                {filePreview === 'file' ? (
                  <div className="file-preview-icon">📄 {selectedFile.fileName}</div>
                ) : (
                  <img src={filePreview} alt="preview" className="img-preview-thumb" />
                )}
                <button type="button" onClick={clearFile} className="clear-file-btn"><X size={14} /></button>
              </div>
            )}
            <div className="input-wrapper">
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
                accept="image/*,.pdf,.csv"
              />
              <button 
                type="button" 
                className="attach-btn" 
                onClick={() => fileInputRef.current.click()}
                title="Attach Image or Document"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                placeholder="Message Gemini..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={aiLoading}
              />
              <button type="submit" disabled={!question.trim() || aiLoading} className="ask-btn" title="Send Message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
              <button 
                type="button" 
                className={`voice-btn ${isListening ? 'listening' : ''}`} 
                onClick={toggleListening}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
              >
                <Mic size={20} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
