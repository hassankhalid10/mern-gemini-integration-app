import React from "react";
import { Paperclip, X, Mic } from 'lucide-react';

export default function ChatInput({ 
  question, 
  setQuestion, 
  onAsk, 
  aiLoading, 
  fileInputRef, 
  handleFileChange, 
  clearFile, 
  selectedFile, 
  filePreview,
  isListening,
  toggleListening
}) {
  return (
    <div className="input-area">
      <form onSubmit={onAsk} className="input-wrapper">
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
  );
}
