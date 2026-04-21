import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Chat from "../models/Chat.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/ask", auth, async (req, res) => {
  try {
    const { question, chatId } = req.body;
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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Initialize Chat with history
    const chatInstance = model.startChat({ history });

    // Send new message
    const result = await chatInstance.sendMessage(question);
    const answer = result.response.text();

    chatSession.messages.push({ role: "user", content: question });
    chatSession.messages.push({ role: "model", content: answer });
    
    await chatSession.save();

    res.json({ answer, chatId: chatSession._id });
  } catch (error) {
    console.error("AI Request Failed:", error);
    res.status(500).json({ msg: "Failed: " + (error.message || JSON.stringify(error)) });
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
