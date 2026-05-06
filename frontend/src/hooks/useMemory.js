import { useState, useCallback } from "react";
import { memoryAPI } from "../services/api";

export const useMemory = (token) => {
  const [memory, setMemory] = useState({ profile: {}, preferences: {}, goals: [] });
  const [showMemory, setShowMemory] = useState(false);
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemVal, setNewMemVal] = useState("");
  const [newMemCat, setNewMemCat] = useState("profile");

  const fetchMemory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await memoryAPI.getMemory(token);
      setMemory(data);
    } catch (err) {
      console.error("Fetch memory failed", err);
    }
  }, [token]);

  const updateMemory = useCallback(async () => {
    if (!newMemVal.trim()) return;
    try {
      let payload;
      if (newMemCat === "goals") {
        payload = [...memory.goals, newMemVal];
      } else {
        payload = { [newMemKey]: newMemVal };
      }
      const data = await memoryAPI.addMemory(token, newMemCat, payload);
      setMemory(data);
      setNewMemKey("");
      setNewMemVal("");
    } catch (err) {
      console.error("Update memory failed", err);
    }
  }, [token, newMemCat, newMemKey, newMemVal]);

  const removeMemory = async (category, key) => {
    try {
      const data = await memoryAPI.deleteMemory(token, category, key);
      setMemory(data);
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
