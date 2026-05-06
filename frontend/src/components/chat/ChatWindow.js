import React from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ 
  currentMessages, 
  aiLoading, 
  messagesEndRef,
  hoveredMsgIdx,
  setHoveredMsgIdx,
  editingMsgIdx,
  setEditingMsgIdx,
  editContent,
  setEditContent,
  onEditSubmit,
  onCopy,
  onRegenerate,
  onSpeak,
  speakingIdx,
  copiedMsgIdx,
  regenLoading,
  runPythonCode,
  pyodideLoaded,
  execResults,
  aiError
}) {
  const lastModelIdx = currentMessages.reduce((last, msg, idx) => msg.role === 'model' ? idx : last, -1);

  return (
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
          {currentMessages.map((msg, idx) => (
            <MessageBubble 
              key={idx}
              msg={msg}
              idx={idx}
              isLastModel={idx === lastModelIdx}
              hoveredMsgIdx={hoveredMsgIdx}
              setHoveredMsgIdx={setHoveredMsgIdx}
              editingMsgIdx={editingMsgIdx}
              setEditingMsgIdx={setEditingMsgIdx}
              editContent={editContent}
              setEditContent={setEditContent}
              onEditSubmit={onEditSubmit}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              onSpeak={onSpeak}
              speakingIdx={speakingIdx}
              copiedMsgIdx={copiedMsgIdx}
              regenLoading={regenLoading}
              aiLoading={aiLoading}
              runPythonCode={runPythonCode}
              pyodideLoaded={!!pyodideLoaded}
              execResults={execResults}
            />
          ))}
          
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
    </div>
  );
}
