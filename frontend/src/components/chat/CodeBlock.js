import React from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodeBlock({ 
  language, 
  value, 
  onRun, 
  isLoading, 
  output, 
  isPython, 
  pyodideLoaded 
}) {
  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span>{language}</span>
        {isPython && (
          <button 
            className="run-code-btn" 
            onClick={onRun}
            disabled={!pyodideLoaded || isLoading}
          >
            {isLoading ? 'Running...' : 'Run Code'}
          </button>
        )}
      </div>
      <SyntaxHighlighter
        children={value}
        style={tomorrow}
        language={language}
        PreTag="div"
      />
      {output && (
        <div className="code-output">
          <strong>Output:</strong>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}
