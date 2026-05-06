import React from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import CodeBlock from "./CodeBlock";

export default function MessageBubble({ 
  msg, 
  idx, 
  isLastModel, 
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
  aiLoading,
  runPythonCode,
  pyodideLoaded,
  execResults
}) {
  const isEditing = editingMsgIdx === idx;
  const isHovered = hoveredMsgIdx === idx && !isEditing;

  return (
    <div
      className={`message ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}${isHovered ? ' hovered' : ''}`}
      onMouseEnter={() => { if (editingMsgIdx === null) setHoveredMsgIdx(idx); }}
      onMouseLeave={() => setHoveredMsgIdx(null)}
    >
      {isEditing ? (
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
              onClick={() => onEditSubmit(idx)}
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
                        <CodeBlock 
                          language={match[1]}
                          value={codeContent}
                          isPython={isPython}
                          pyodideLoaded={pyodideLoaded}
                          onRun={() => runPythonCode(codeContent, blockId)}
                          isLoading={execResults[blockId]?.loading}
                          output={execResults[blockId]?.output}
                        />
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
                onClick={() => onCopy(msg.content, idx)}
              >
                {copiedMsgIdx === idx ? '✓' : '📋'}
              </button>
            )}
            {msg.role === 'model' && (
              <button
                className="speaker-btn"
                title={speakingIdx === idx ? "Stop" : "Listen"}
                onClick={() => onSpeak(msg.content, idx)}
              >
                {speakingIdx === idx ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            )}
            {msg.role === 'model' && isLastModel && (
              <button
                title="Regenerate"
                disabled={aiLoading || editingMsgIdx !== null}
                onClick={onRegenerate}
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
  );
}
