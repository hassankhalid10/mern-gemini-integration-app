/**
 * Memory Hook
 * 
 * This helper tool manages the AI's "Long-term Memory". It allows the app
 * to fetch what the AI remembers about you, add new facts, or delete
 * things it should forget.
 */

import { useState, useCallback } from "react";

import { memoryAPI } from "../services/api";

export const useMemory = (token) => {
  // --- State Management ---

  // Holds all the pieces of info the AI remembers (Profile, Preferences, Goals)
  const [memory, setMemory] = useState({ profile: {}, preferences: {}, goals: [] });
  
  // A True/False switch to show or hide the "Memory Manager" popup window
  const [showMemory, setShowMemory] = useState(false);
  
  // These store the data you are currently typing into the "Add Memory" form
  const [newMemKey, setNewMemKey] = useState(""); // The "Label" (e.g., "Favorite Color")
  const [newMemVal, setNewMemVal] = useState(""); // The "Value" (e.g., "Blue")
  const [newMemCat, setNewMemCat] = useState("profile"); // Which category it belongs to


  /**
   * Fetches your saved memory from the server so the app can show it.
   */
  const fetchMemory = useCallback(async () => {
    if (!token) return; // Need to be logged in
    try {
      const data = await memoryAPI.getMemory(token);
      setMemory(data); // Save the fetched memory to our state
    } catch (err) {
      console.error("Fetch memory failed", err);
    }
  }, [token]);


  /**
   * Sends new information to the server to be added to the AI's memory.
   */
  const updateMemory = useCallback(async () => {
    if (!newMemVal.trim()) return; // Don't add empty info
    try {
      let payload;
      // 1. Prepare the data differently depending on the category
      if (newMemCat === "goals") {
        payload = [...memory.goals, newMemVal]; // Add to the end of the goals list
      } else {
        payload = { [newMemKey]: newMemVal }; // Add as a Label:Value pair
      }
      
      // 2. Tell the server to save it
      const data = await memoryAPI.addMemory(token, newMemCat, payload);
      
      // 3. Update our local memory with the fresh data from the server
      setMemory(data);
      
      // 4. Clear the input boxes
      setNewMemKey("");
      setNewMemVal("");
    } catch (err) {
      console.error("Update memory failed", err);
    }
  }, [token, newMemCat, newMemKey, newMemVal]);


  /**
   * Tells the server to delete a specific piece of memory.
   */
  const removeMemory = async (category, key) => {
    try {
      const data = await memoryAPI.deleteMemory(token, category, key);
      setMemory(data); // Refresh our local memory to show it's gone
    } catch (err) {
      console.error("Delete memory failed", err);
    }
  };


  return {
    memory,
    showMemory,
    setShowMemory,
    newMemKey,
    setNewMemKey,
    newMemVal,
    setNewMemVal,
    newMemCat,
    setNewMemCat,
    fetchMemory,
    updateMemory,
    removeMemory
  };
};
