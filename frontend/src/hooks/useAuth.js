/**
 * Authentication Hook
 * 
 * This is a "Helper" tool that manages everything to do with logging in.
 * It remembers your email, password, and the "key" (token) that proves 
 * you are logged in.
 */

import { useState, useEffect, useCallback } from "react";

import { authAPI } from "../services/api";

export const useAuth = () => {
  // --- State Management ---
  
  // This is your "Entry Ticket" (token). If it's empty, you aren't logged in.
  // We check 'localStorage' to see if you were already logged in from a previous visit.
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  
  // Keeps track of whether we are showing the "Login" form or the "Sign Up" form.
  const [isLoginView, setIsLoginView] = useState(true);
  
  // These store what you type into the name, email, and password boxes.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Turns on a "Loading" spinner while we wait for the server to check your password.
  const [authLoading, setAuthLoading] = useState(false);
  
  // Stores any error messages (like "Wrong Password") to show on the screen.
  const [authError, setAuthError] = useState("");


  /**
   * Syncing Token: Whenever the 'token' changes, we save it to the browser's 
   * memory (localStorage) so you stay logged in even if you refresh the page.
   */
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);


  /**
   * The main function that handles clicking the "Login" or "Sign Up" button.
   */
  const handleAuth = useCallback(async (e) => {
    if (e) e.preventDefault(); // Stop the page from refreshing
    setAuthLoading(true); // Start the loading spinner
    setAuthError(""); // Clear old errors
    
    try {
      // 1. Ask the server to log us in or sign us up
      const data = isLoginView 
        ? await authAPI.login(email, password)
        : await authAPI.signup(email, password);
      
      // 2. If the server gives us a "token", it means we are successful!
      if (data.token) {
        setToken(data.token); // Save the token to our state
      } else {
        // 3. Otherwise, show the error message from the server
        setAuthError(data.msg || "Authentication failed");
      }
    } catch (err) {
      setAuthError("Authentication failed");
    } finally {
      setAuthLoading(false); // Stop the loading spinner
    }
  }, [isLoginView, email, password]);


  /**
   * Logs you out by clearing the "token" from the app and the browser memory.
   */
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
