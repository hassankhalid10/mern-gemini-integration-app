import React, { useState } from "react";
import { Pin, Trash2, Edit3, Check, X } from 'lucide-react';

export default function HistoryItem({ 
  chat, 
  isActive, 
  onSelect, 
  onTogglePin, 
  onRename, 
  onDelete 
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRenameSubmit = (e) => {
    e.stopPropagation();
    onRename(chat._id, renameValue);
    setIsRenaming(false);
  };

  return (
    <div 
      className={`history-item ${isActive ? 'active' : ''} ${chat.isPinned ? 'pinned' : ''}`}
      onClick={() => onSelect(chat._id)}
    >
      <div className="history-info">
        {isRenaming ? (
          <div className="rename-input-wrapper" onClick={e => e.stopPropagation()}>
            <input 
              value={renameValue} 
              onChange={e => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleRenameSubmit(e)}
            />
            <button onClick={handleRenameSubmit}><Check size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); setIsRenaming(false); }}><X size={14} /></button>
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
          onClick={(e) => onTogglePin(chat._id, e)}
          title={chat.isPinned ? "Unpin" : "Pin"}
        >
          <Pin size={14} fill={chat.isPinned ? "currentColor" : "none"} />
        </button>
        <button 
          className="action-btn" 
          onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenameValue(chat.title); }}
          title="Rename"
        >
          <Edit3 size={14} />
        </button>
        <button 
          className="action-btn delete-btn" 
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={e => e.stopPropagation()}>
          <div className="delete-confirm-modal">
            <p>Delete this chat?</p>
            <div className="confirm-btns">
              <button className="confirm-yes" onClick={(e) => onDelete(chat._id, e)}>Yes</button>
              <button className="confirm-no" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
