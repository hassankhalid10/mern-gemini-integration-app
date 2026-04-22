import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Chat from "../models/Chat.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { maxOutputTokens: maxTokens ? parseInt(maxTokens) : 2048 }
    });

    // Initialize Chat with history
    const chatInstance = model.startChat({ history });

    const finalQuestion = tone && tone !== 'Neutral' ? `[Please respond in a ${tone} tone] ${question}` : question;

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
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
                            .select('_id title updatedAt')
                            .sort({ updatedAt: -1 });
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

export default router;
