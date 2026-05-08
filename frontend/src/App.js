/**
 * Main App Container
 * 
 * This is the "Heart" of the website. It organizes everything you see on the
 * screen, including the sidebar, the chat window, and the input box. 
 * it also manages the "state" (like which chat you are currently looking at).
 */

import React, { useState, useEffect, useRef } from "react";

import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { useSpeech } from "./hooks/useSpeech";
import { useMemory } from "./hooks/useMemory";
import AuthContainer from "./components/auth/AuthContainer";
import Sidebar from "./components/sidebar/Sidebar";
import ChatWindow from "./components/chat/ChatWindow";
import ChatInput from "./components/input/ChatInput";
import MemoryManager from "./components/modals/MemoryManager";
import "./App.css";

export default function App() {
  const {
    token, isLoginView, setIsLoginView, name, setName, email, setEmail,
    password, setPassword, authLoading, authError, setAuthError, handleAuth, logout
  } = useAuth();

  const {
    chatSessions, activeChatId, currentMessages, aiLoading, regenLoading,
    aiError, sidebarError, loadChatsList, loadSpecificChat, startNewChat,
    askAI, regenerateAI, editMessage, togglePin, renameChat, deleteChat,
    setAiError
  } = useChat(token);

  // --- UI & Global State ---
  
  // This is what you are currently typing in the chat box
  const [question, setQuestion] = useState("");
  
  // Speech controls (hearing your voice and reading back AI answers)
  const { isListening, toggleListening, speakText, speakingIdx } = useSpeech(setQuestion);

  // --- AI Memory Hook ---
  // This manages the AI's "Long-term Memory" about you.
  const {
    memory, showMemory, setShowMemory, newMemKey, setNewMemKey, newMemVal,
    setNewMemVal, newMemCat, setNewMemCat, fetchMemory, updateMemory, removeMemory
  } = useMemory(token);


  // --- Settings state ---
  // Stores your chosen AI personality (tone) and how long the answers can be (tokens)
  const [tone, setTone] = useState(localStorage.getItem("tone") || "Neutral");
  const [maxTokens, setMaxTokens] = useState(parseInt(localStorage.getItem("maxTokens")) || 8192);
  const [showSettings, setShowSettings] = useState(false);

  // --- Multimodal state (Files/Images) ---
  // Stores the file you picked to show the AI
  const [selectedFile, setSelectedFile] = useState(null);
  // Stores a small picture (preview) of the file you picked
  const [filePreview, setFilePreview] = useState(null);
  // A "reference" to the hidden file picker button
  const fileInputRef = useRef(null);

  // --- Code Execution state ---
  // This is the "Python Engine" that runs code right in your browser
  const [pyodide, setPyodide] = useState(null);
  // Stores the results (output or errors) of any code you ran
  const [execResults, setExecResults] = useState({});
  // A "reference" to the bottom of the chat, so we can automatically scroll down
  const messagesEndRef = useRef(null);


  /**
   * Effect: Automatically load your chats and AI memory when you log in.
   */
  useEffect(() => {
    if (token) {
      loadChatsList();
      fetchMemory();
    }
  }, [token, loadChatsList, fetchMemory]);


  /**
   * Effect: Load the "Pyodide" engine so you can run Python code.
   * This runs only once when you first open the app.
   */
  useEffect(() => {
    async function initPyodide() {
      if (window.loadPyodide) {
        try {
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/npm/pyodide@0.26.1/"
          });
          setPyodide(py); // The engine is now ready to use
          console.log("Pyodide Loaded");
        } catch (err) {
          console.error("Pyodide failed to load", err);
        }
      }
    }
    initPyodide();
  }, []);


  /**
   * Handles picking a file (like an image) to send to the AI.
   * It converts the file into a format the AI can read (Base64).
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setSelectedFile({ mimeType: file.type, data: base64Data, fileName: file.name });
      setFilePreview(file.type.startsWith('image/') ? reader.result : 'file');
    };
    reader.readAsDataURL(file);
  };


  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Runs Python code directly in your browser window.
   */
  const runPythonCode = async (code, blockId) => {
    if (!pyodide) return;
    setExecResults(prev => ({ ...prev, [blockId]: { loading: true, output: "" } }));
    try {
      // 1. Setup a "virtual screen" to capture the code's output
      await pyodide.runPythonAsync(`import sys\nimport io\nsys.stdout = io.StringIO()`);
      
      // 2. Run the actual code
      await pyodide.runPythonAsync(code);
      
      // 3. Get the results and show them on the screen
      const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      setExecResults(prev => ({ ...prev, [blockId]: { loading: false, output: stdout || "Execution successful" } }));
    } catch (err) {
      setExecResults(prev => ({ ...prev, [blockId]: { loading: false, output: `Error: ${err.message}` } }));
    }
  };


  const onAsk = (e) => {
    e.preventDefault();
    askAI(question, selectedFile, tone, maxTokens, () => {
      setQuestion("");
      clearFile();
    });
  };

  const [hoveredMsgIdx, setHoveredMsgIdx] = useState(null);
  const [editingMsgIdx, setEditingMsgIdx] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);

  const handleCopy = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 1500);
    } catch (err) { console.error("Copy failed", err); }
  };

  const onEditSubmit = async (idx) => {
    const success = await editMessage(idx, editContent, tone, maxTokens);
    if (success) {
      setEditingMsgIdx(null);
      setEditContent("");
    }
  };

  if (!token) {
    return (
      <AuthContainer 
        isLoginView={isLoginView} setIsLoginView={setIsLoginView}
        handleAuth={handleAuth} authLoading={authLoading} authError={authError}
        name={name} setName={setName} email={email} setEmail={setEmail}
        password={password} setPassword={setPassword} setAuthError={setAuthError}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        chatSessions={chatSessions} activeChatId={activeChatId}
        onSelectChat={loadSpecificChat} onStartNewChat={startNewChat}
        logout={logout} showSettings={showSettings} setShowSettings={setShowSettings}
        setShowMemory={setShowMemory} sidebarError={sidebarError}
        onTogglePin={togglePin} onRenameChat={renameChat} onDeleteChat={deleteChat}
        tone={tone} setTone={setTone} maxTokens={maxTokens} setMaxTokens={setMaxTokens}
      />
      
      <main className="main-content">
        <ChatWindow 
          currentMessages={currentMessages} aiLoading={aiLoading} 
          messagesEndRef={messagesEndRef} hoveredMsgIdx={hoveredMsgIdx}
          setHoveredMsgIdx={setHoveredMsgIdx} editingMsgIdx={editingMsgIdx}
          setEditingMsgIdx={setEditingMsgIdx} editContent={editContent}
          setEditContent={setEditContent} onEditSubmit={onEditSubmit}
          onCopy={handleCopy} onRegenerate={() => regenerateAI(tone, maxTokens)}
          onSpeak={speakText} speakingIdx={speakingIdx} copiedMsgIdx={copiedMsgIdx}
          regenLoading={regenLoading} runPythonCode={runPythonCode}
          pyodideLoaded={!!pyodide} execResults={execResults} aiError={aiError}
        />

        <ChatInput 
          question={question} setQuestion={setQuestion} onAsk={onAsk}
          aiLoading={aiLoading} fileInputRef={fileInputRef}
          handleFileChange={handleFileChange} clearFile={clearFile}
          selectedFile={selectedFile} filePreview={filePreview}
          isListening={isListening} toggleListening={toggleListening}
        />
      </main>

      {showMemory && (
        <MemoryManager 
          memory={memory} onClose={() => setShowMemory(false)}
          newMemCat={newMemCat} setNewMemCat={setNewMemCat}
          newMemKey={newMemKey} setNewMemKey={setNewMemKey}
          newMemVal={newMemVal} setNewMemVal={setNewMemVal}
          onAdd={updateMemory} onRemove={removeMemory}
        />
      )}
    </div>
  );
}
