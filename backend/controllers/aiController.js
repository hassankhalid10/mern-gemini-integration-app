import Chat from "../models/Chat.js";
import { getGeminiModel, generateAIResponse } from "../services/geminiService.js";

export const askQuestion = async (req, res) => {
  try {
    const { question, chatId, tone, maxTokens, fileData } = req.body;
    const userId = req.user.id;

    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) return res.status(404).json({ msg: "Chat not found" });
    } else {
      chat = new Chat({ userId, messages: [], title: question.substring(0, 40) });
    }

    const model = getGeminiModel(tone);
    const answer = await generateAIResponse(model, chat.messages, question, fileData, maxTokens);

    chat.messages.push({ role: "user", content: question, file: fileData });
    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    res.json({ answer, chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "AI request failed" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const sessions = await Chat.find({ userId: req.user.id })
      .select("title isPinned updatedAt")
      .sort({ isPinned: -1, updatedAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch history" });
  }
};

export const getChatDetails = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch chat details" });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    res.json({ msg: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete chat" });
  }
};

export const renameChat = async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Failed to rename chat" });
  }
};

export const togglePin = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    
    chat.isPinned = !chat.isPinned;
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Failed to toggle pin" });
  }
};

export const regenerateResponse = async (req, res) => {
  try {
    const { chatId, tone, maxTokens } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat || chat.messages.length < 1) return res.status(400).json({ msg: "Invalid chat" });

    // Remove last model message if it exists
    if (chat.messages[chat.messages.length - 1].role === "model") {
      chat.messages.pop();
    }

    const lastUserMsg = chat.messages[chat.messages.length - 1];
    const history = chat.messages.slice(0, -1);

    const model = getGeminiModel(tone);
    const answer = await generateAIResponse(model, history, lastUserMsg.content, lastUserMsg.file, maxTokens);

    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Regeneration failed" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { chatId, messageIndex, newContent, tone, maxTokens } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    // Truncate history to the edited message
    chat.messages = chat.messages.slice(0, messageIndex);
    
    const model = getGeminiModel(tone);
    const answer = await generateAIResponse(model, chat.messages, newContent, null, maxTokens);

    chat.messages.push({ role: "user", content: newContent });
    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Edit failed" });
  }
};
