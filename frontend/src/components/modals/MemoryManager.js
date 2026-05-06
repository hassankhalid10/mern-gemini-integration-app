import React from "react";
import { Brain, X, Trash2 } from 'lucide-react';

export default function MemoryManager({ 
  memory, 
  onClose, 
  newMemCat, setNewMemCat,
  newMemKey, setNewMemKey,
  newMemVal, setNewMemVal,
  onAdd,
  onRemove
}) {
  return (
    <div className="memory-overlay" onClick={onClose}>
      <div className="memory-modal glass-card" onClick={e => e.stopPropagation()}>
        <div className="memory-header">
          <h3><Brain size={20} /> AI Memory Manager</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
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
                placeholder={newMemCat === "goals" ? "Add a new goal..." : "Value (e.g. Dubai)"} 
                value={newMemVal}
                onChange={e => setNewMemVal(e.target.value)}
              />
              <button className="primary-btn" onClick={onAdd}>Add</button>
            </div>
          </div>

          <div className="memory-grid">
            {/* Profile Section */}
            <div className="memory-card">
              <h5>👤 Profile Facts</h5>
              <div className="memory-items">
                {Object.entries(memory.profile || {}).map(([k, v]) => (
                  <div key={k} className="memory-item">
                    <span><strong>{k}:</strong> {v}</span>
                    <button onClick={() => onRemove('profile', k)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="memory-card">
              <h5>⚙️ Preferences</h5>
              <div className="memory-items">
                {Object.entries(memory.preferences || {}).map(([k, v]) => (
                  <div key={k} className="memory-item">
                    <span><strong>{k}:</strong> {v}</span>
                    <button onClick={() => onRemove('preferences', k)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals Section */}
            <div className="memory-card full-width">
              <h5>🎯 Current Goals</h5>
              <div className="goal-tags">
                {(memory.goals || []).map((goal, i) => (
                  <div key={i} className="goal-tag">
                    {goal}
                    <button onClick={() => onRemove('goals', i)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
