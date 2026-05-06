import React from "react";
import { Settings, Brain } from 'lucide-react';
import HistoryItem from "./HistoryItem";

export default function Sidebar({ 
  chatSessions, 
  activeChatId, 
  onSelectChat, 
  onStartNewChat, 
  logout, 
  setShowSettings, 
  showSettings,
  setShowMemory,
  sidebarError,
  onTogglePin,
  onRenameChat,
  onDeleteChat,
  tone,
  setTone,
  maxTokens,
  setMaxTokens
}) {
  return (
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
          <button onClick={onStartNewChat} className="primary-btn" style={{ width: '100%', fontSize: '14px', padding: '10px' }}>
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
            <select value={tone} onChange={e => setTone(e.target.value)}>
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
              onChange={e => setMaxTokens(e.target.value)}
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
            <HistoryItem 
              key={chat._id}
              chat={chat}
              isActive={activeChatId === chat._id}
              onSelect={onSelectChat}
              onTogglePin={onTogglePin}
              onRename={onRenameChat}
              onDelete={onDeleteChat}
            />
          ))
        )}
      </div>
    </aside>
  );
}
