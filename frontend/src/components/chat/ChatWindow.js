/**
 * Chat Window Component
 * 
 * This is the main area where your messages and the AI's answers 
 * appear. It handles displaying the conversation and shows a 
 * "loading" animation when the AI is thinking.
 */

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
        {/* Welcome Screen: Only shows up if there are no messages yet */}
        {currentMessages.length === 0 && !aiLoading && (
          <div className="welcome-chat">
            <div className="welcome-logo">✨</div>
            <h2>Hi there! 👋</h2>
            <p>Welcome to the MERN Gemini Integration App. Start a conversation.</p>
          </div>
        )}

        
        {/* Messages Flow: This part scrolls and holds all the chat bubbles */}
        <div className="messages-flow">
          {/* Loop through each message and create a 'MessageBubble' for it */}
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

          
          {/* AI Loading: Shows the "..." animation when the AI is thinking */}
          {aiLoading && (
            <div className="message ai-msg">
              <div className="bubble ai-bubble loading-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          {/* This empty div is used as a target for "Scroll to Bottom" */}
          <div ref={messagesEndRef} />
        </div>

        
        {aiError && (
          <div className="error-banner chat-error">{aiError}</div>
        )}
      </div>
    </div>
  );
}
