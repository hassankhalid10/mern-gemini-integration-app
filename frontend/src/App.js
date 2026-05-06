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

  const [question, setQuestion] = useState("");
  const { isListening, toggleListening, speakText, speakingIdx } = useSpeech(setQuestion);

  const {
    memory, showMemory, setShowMemory, newMemKey, setNewMemKey, newMemVal,
    setNewMemVal, newMemCat, setNewMemCat, fetchMemory, updateMemory, removeMemory
  } = useMemory(token);

  // Settings state
  const [tone, setTone] = useState(localStorage.getItem("tone") || "Neutral");
  const [maxTokens, setMaxTokens] = useState(parseInt(localStorage.getItem("maxTokens")) || 8192);
  const [showSettings, setShowSettings] = useState(false);

  // Multimodal state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Code Execution state
  const [pyodide, setPyodide] = useState(null);
  const [execResults, setExecResults] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (token) {
      loadChatsList();
      fetchMemory();
    }
  }, [token, loadChatsList, fetchMemory]);

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

  const runPythonCode = async (code, blockId) => {
    if (!pyodide) return;
    setExecResults(prev => ({ ...prev, [blockId]: { loading: true, output: "" } }));
    try {
      await pyodide.runPythonAsync(`import sys\nimport io\nsys.stdout = io.StringIO()`);
      await pyodide.runPythonAsync(code);
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
