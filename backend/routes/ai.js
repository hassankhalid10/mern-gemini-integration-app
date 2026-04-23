import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Lazy initialization for genAI to ensure process.env is loaded in ESM
let genAI;
const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from environment variables");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// Helper to get user memory as a prompt
const getMemoryPrompt = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.memory) return "";
  
  const { profile, preferences, goals } = user.memory;
  let profileStr = Array.from(profile.entries()).map(([k, v]) => `${k}: ${v}`).join(", ");
  let prefStr = Array.from(preferences.entries()).map(([k, v]) => `${k}: ${v}`).join(", ");
  let goalsStr = goals.join(", ");
  
  return `Context about the user:
- Profile: ${profileStr || "Unknown"}
- Preferences: ${prefStr || "None"}
- Goals: ${goalsStr || "None"}
Please use this information to personalize your responses when relevant.`;
};

// NEW: Helper to extract memory from conversation
const extractAndSaveMemory = async (userId, userMessage) => {
  try {
    console.log(`[Memory] Analyzing message from user ${userId}...`);
    
    const extractionPrompt = `
      You are a specialized AI that extracts permanent user information. 
      Analyze the text below and extract:
      1. Profile: Long-term facts (e.g. Name, Age, Job, Location).
      2. Preferences: Likes, dislikes, habits, or preferred style.
      3. Goals: Current projects or learning objectives.

      Return ONLY a JSON object with this structure:
      {"profile": {"key": "value"}, "preferences": {"key": "value"}, "goals": ["string"]}

      If no new info is found, return empty fields.
      Do not repeat info the user didn't mention.

      User Text: "${userMessage}"
    `;

    const model = getGenAI().getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text();
    
    // Parse JSON safely
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("[Memory] No structured data found in AI response.");
      return;
    }
    
    const extracted = JSON.parse(jsonMatch[0]);
    const user = await User.findById(userId);
    if (!user) return;
    
    // Ensure memory object and sub-maps exist
    if (!user.memory) user.memory = {};
    if (!user.memory.profile) user.memory.profile = new Map();
    if (!user.memory.preferences) user.memory.preferences = new Map();
    if (!user.memory.goals) user.memory.goals = [];

    let hasUpdates = false;

    // Update Profile
    if (extracted.profile) {
      for (const [k, v] of Object.entries(extracted.profile)) {
        if (user.memory.profile.get(k) !== v) {
          user.memory.profile.set(k, v);
          hasUpdates = true;
          console.log(`[Memory] New Profile Fact: ${k} = ${v}`);
        }
      }
    }

    // Update Preferences
    if (extracted.preferences) {
      for (const [k, v] of Object.entries(extracted.preferences)) {
        if (user.memory.preferences.get(k) !== v) {
          user.memory.preferences.set(k, v);
          hasUpdates = true;
          console.log(`[Memory] New Preference: ${k} = ${v}`);
        }
      }
    }

    // Update Goals
    if (extracted.goals && Array.isArray(extracted.goals)) {
      const currentGoals = new Set(user.memory.goals);
      extracted.goals.forEach(g => {
        if (!currentGoals.has(g)) {
          user.memory.goals.push(g);
          hasUpdates = true;
          console.log(`[Memory] New Goal identified: ${g}`);
        }
      });
    }

    if (hasUpdates) {
      await user.save();
      console.log(`[Memory] Successfully saved updates for user ${userId}`);
    } else {
      console.log("[Memory] No new unique information found to save.");
    }
  } catch (err) {
    console.error("[Memory Error] Extraction failed:", err.message);
  }
};

router.post("/ask", auth, async (req, res) => {
  try {
    const { question, chatId, tone, maxTokens } = req.body;
    let chatSession;
    let history = [];

    // Retrieve existing chat or prepare for a new one
    if (chatId) {
      chatSession = await Chat.findOne({ _id: chatId, userId: req.user.id });
      if (!chatSession) {
        return res.status(404).json({ msg: "Chat not found" });
      }
      
      // Map DB messages to Gemini format
      history = chatSession.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
    } else {
      // New chat. Use the first question as a tentative title
      chatSession = new Chat({
        userId: req.user.id,
        title: question.substring(0, 30) + (question.length > 30 ? "..." : ""),
        messages: []
      });
    }

    const memoryPrompt = await getMemoryPrompt(req.user.id);
    const finalQuestion = tone && tone !== 'Neutral' ? `[Please respond in a ${tone} tone] ${question}` : question;

    const model = getGenAI().getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: memoryPrompt,
      generationConfig: { maxOutputTokens: maxTokens ? parseInt(maxTokens) : 2048 }
    });

    const chatInstance = model.startChat({ history });

    // Send new message
    const result = await chatInstance.sendMessage(finalQuestion);
    const answer = result.response.text();

    // Validate response is not empty
    if (!answer || answer.trim() === '') {
      return res.status(500).json({ msg: "AI returned an empty response. Try rephrasing your question." });
    }

    chatSession.messages.push({ role: "user", content: question });
    chatSession.messages.push({ role: "model", content: answer });
    
    await chatSession.save();

    // Trigger memory extraction in the background (don't await to keep UI fast)
    extractAndSaveMemory(req.user.id, question).catch(console.error);

    res.json({ answer, chatId: chatSession._id, messages: chatSession.messages });
  } catch (error) {
    console.error("AI Request Failed:", error);
    res.status(500).json({ msg: "Failed: " + (error.message || JSON.stringify(error)) });
  }
});

router.post("/regenerate", auth, async (req, res) => {
  try {
    const { chatId, tone, maxTokens } = req.body;
    if (!chatId) return res.status(400).json({ msg: "Chat ID is required" });

    const chatSession = await Chat.findOne({ _id: chatId, userId: req.user.id });
    if (!chatSession || chatSession.messages.length < 2) {
      return res.status(400).json({ msg: "Not enough messages to regenerate" });
    }

    // Ensure last message is from model
    if (chatSession.messages[chatSession.messages.length - 1].role === 'model') {
      chatSession.messages.pop(); // Remove last model message
    }

    // Get the last user message
    const lastUserMessageObj = chatSession.messages[chatSession.messages.length - 1];
    if (lastUserMessageObj.role !== 'user') {
      return res.status(400).json({ msg: "Cannot regenerate: Last message is not from user" });
    }

    // The history should NOT include the last user message because we re-send it
    const historyMessages = chatSession.messages.slice(0, -1);
    const history = historyMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const memoryPrompt = await getMemoryPrompt(req.user.id);
    const model = getGenAI().getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: memoryPrompt,
      generationConfig: { maxOutputTokens: maxTokens ? parseInt(maxTokens) : 2048 }
    });

    const chatInstance = model.startChat({ history });

    const question = lastUserMessageObj.content;
    const finalQuestion = tone && tone !== 'Neutral' ? `[Please respond in a ${tone} tone] ${question}` : question;

    const result = await chatInstance.sendMessage(finalQuestion);
    const answer = result.response.text();

    // Validate response is not empty
    if (!answer || answer.trim() === '') {
      return res.status(500).json({ msg: "AI returned an empty response. Try rephrasing your question." });
    }

    chatSession.messages.push({ role: "model", content: answer });
    await chatSession.save();

    res.json({ answer, messages: chatSession.messages });
  } catch (error) {
    console.error("AI Regenerate Failed:", error);
    res.status(500).json({ msg: "Regenerate Failed: " + (error.message || JSON.stringify(error)) });
  }
});

router.post("/edit", auth, async (req, res) => {
  try {
    const { chatId, messageIndex, newContent, tone, maxTokens } = req.body;
    if (!chatId || messageIndex === undefined || !newContent) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const chatSession = await Chat.findOne({ _id: chatId, userId: req.user.id });
    if (!chatSession) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Slice the messages up to the index
    const slicedMessages = chatSession.messages.slice(0, messageIndex);
    
    const history = slicedMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const memoryPrompt = await getMemoryPrompt(req.user.id);
    const model = getGenAI().getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: memoryPrompt,
      generationConfig: { maxOutputTokens: maxTokens ? parseInt(maxTokens) : 2048 }
    });

    const chatInstance = model.startChat({ history });

    const question = newContent;
    const finalQuestion = tone && tone !== 'Neutral' ? `[Please respond in a ${tone} tone] ${question}` : question;

    const result = await chatInstance.sendMessage(finalQuestion);
    const answer = result.response.text();

    // Validate response is not empty
    if (!answer || answer.trim() === '') {
      return res.status(500).json({ msg: "AI returned an empty response. Try rephrasing your question." });
    }

    // Update DB with the new truncated history + new user message + new model message
    chatSession.messages = [
      ...slicedMessages,
      { role: "user", content: question },
      { role: "model", content: answer }
    ];

    if (messageIndex === 0) {
      chatSession.title = question.substring(0, 30) + (question.length > 30 ? "..." : "");
    }

    await chatSession.save();

    res.json({ answer, messages: chatSession.messages });
  } catch (error) {
    console.error("AI Edit Failed:", error);
    res.status(500).json({ msg: "Edit Failed: " + (error.message || JSON.stringify(error)) });
  }
});

// Get all chat sessions for the sidebar (optimizated to not fetch huge message payload)
router.get("/history", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
                            .select('_id title isPinned updatedAt')
                            .sort({ isPinned: -1, updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ msg: "Error fetching history" });
  }
});

// Get specific chat 
router.get("/chat/:id", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    
    res.json(chat);
  } catch (error) {
    res.status(500).json({ msg: "Error fetching chat details" });
  }
});

// Pin/Unpin chat
router.patch("/chat/:id/pin", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    chat.isPinned = !chat.isPinned;
    await chat.save();
    res.json({ msg: chat.isPinned ? "Chat pinned" : "Chat unpinned", isPinned: chat.isPinned });
  } catch (error) {
    res.status(500).json({ msg: "Error toggling pin status" });
  }
});

// Rename chat
router.patch("/chat/:id/rename", auth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ msg: "Title is required" });

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    res.json({ msg: "Chat renamed", title: chat.title });
  } catch (error) {
    res.status(500).json({ msg: "Error renaming chat" });
  }
});

// Delete chat
router.delete("/chat/:id", auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    res.json({ msg: "Chat deleted" });
  } catch (error) {
    res.status(500).json({ msg: "Error deleting chat" });
  }
});

export default router;
