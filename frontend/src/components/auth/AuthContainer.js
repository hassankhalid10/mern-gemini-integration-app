import React from "react";

export default function AuthContainer({ 
  isLoginView, 
  setIsLoginView, 
  handleAuth, 
  authLoading, 
  authError, 
  name, setName, 
  email, setEmail, 
  password, setPassword,
  setAuthError 
}) {
  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div className="logo-section">
          <div className="ai-icon">AI</div>
          <h2>{isLoginView ? "Welcome Back" : "Create Account"}</h2>
        </div>
        {authError && <div className="error-banner">{authError}</div>}
        <form onSubmit={handleAuth}>
          {!isLoginView && (
            <div className="input-group">
              <label>Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="John Doe"
                required 
              />
            </div>
          )}
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com"
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="primary-btn" disabled={authLoading}>
            {authLoading ? <div className="spinner"></div> : isLoginView ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="toggle-text">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => {setIsLoginView(!isLoginView); setAuthError("");}}>
            {isLoginView ? "Sign up here" : "Login here"}
          </span>
        </p>
      </div>
    </div>
  );
}
