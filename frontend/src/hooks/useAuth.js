import { useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const handleAuth = useCallback(async (e) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = isLoginView 
        ? await authAPI.login(email, password)
        : await authAPI.signup(email, password);
      
      if (data.token) {
        setToken(data.token);
      } else {
        setAuthError(data.msg || "Authentication failed");
      }
    } catch (err) {
      setAuthError("Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }, [isLoginView, email, password]);

  const logout = useCallback(() => {
    setToken("");
    localStorage.removeItem("token");
  }, []);

  return {
    token,
    isLoginView,
    setIsLoginView,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    authError,
    setAuthError,
    handleAuth,
    logout
  };
};
