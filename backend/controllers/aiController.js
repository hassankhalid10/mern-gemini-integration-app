/**
 * AI Controller
 * 
 * This file is like the "Manager" for all AI-related features in the app.
 * It handles everything from asking the AI questions to managing your 
 * saved conversations (deleting, renaming, pinning, etc.).
 * 
 * Think of it as the bridge between you and the Gemini AI.
 */

import Chat from "../models/Chat.js";

import { getGeminiModel, generateAIResponse } from "../services/geminiService.js";

/**
 * Sends your question to the AI and saves the conversation.
 * If it's a new chat, it creates a title based on your question.
 */
export const askQuestion = async (req, res) => {
  try {
    const { question, chatId, tone, maxTokens, fileData } = req.body;
    const userId = req.user.id;

    let chat;
    // 1. Check if we are adding to an existing chat or starting a brand new one
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) return res.status(404).json({ msg: "Chat not found" });
    } else {
      // Create a new chat session if no ID was provided
      chat = new Chat({ userId, messages: [], title: question.substring(0, 40) });
    }

    // 2. Prepare the AI (pick the right 'Personality' or 'Tone')
    const model = getGeminiModel(tone);
    
    // 3. Ask Gemini for an answer, giving it the chat history so it has context
    const answer = await generateAIResponse(model, chat.messages, question, fileData, maxTokens);

    // 4. Save both your question and the AI's answer into the database
    chat.messages.push({ role: "user", content: question, file: fileData });
    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    // 5. Send the answer back to the user's screen
    res.json({ answer, chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "AI request failed" });
  }
};


/**
 * Fetches a list of all your past conversations so you can see them in the sidebar.
 * It shows pinned chats first, then the most recent ones.
 */
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

/**
 * Opens a specific conversation to show all the messages inside it.
 */
export const getChatDetails = async (req, res) => {

  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch chat details" });
  }
};

/**
 * Deletes a conversation from your history.
 */
export const deleteChat = async (req, res) => {

  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });
    res.json({ msg: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete chat" });
  }
};

/**
 * Allows you to change the title/name of a conversation.
 */
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

/**
 * Pins a conversation to the top of your list so it's easy to find,
 * or unpins it if it's already pinned.
 */
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

/**
 * If you don't like the AI's last answer, this tells it to try again.
 */
export const regenerateResponse = async (req, res) => {
  try {
    const { chatId, tone, maxTokens } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat || chat.messages.length < 1) return res.status(400).json({ msg: "Invalid chat" });

    // 1. Remove the AI's last message so we can replace it with a new one
    if (chat.messages[chat.messages.length - 1].role === "model") {
      chat.messages.pop();
    }

    // 2. Grab the very last thing the user said
    const lastUserMsg = chat.messages[chat.messages.length - 1];
    
    // 3. Get the history *before* that last message
    const history = chat.messages.slice(0, -1);

    // 4. Ask the AI to try answering that last question again
    const model = getGeminiModel(tone);
    const answer = await generateAIResponse(model, history, lastUserMsg.content, lastUserMsg.file, maxTokens);

    // 5. Save the new answer and send it back
    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Regeneration failed" });
  }
};


/**
 * Lets you go back and change something you said earlier.
 * The AI will then rewrite its response based on your edit.
 */
export const editMessage = async (req, res) => {
  try {
    const { chatId, messageIndex, newContent, tone, maxTokens } = req.body;
    const userId = req.user.id;

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    // 1. Cut off the conversation at the point where the edit happened
    // Everything after the edited message is removed (deleted)
    chat.messages = chat.messages.slice(0, messageIndex);
    
    // 2. Ask the AI for a new response based on your edited text
    const model = getGeminiModel(tone);
    const answer = await generateAIResponse(model, chat.messages, newContent, null, maxTokens);

    // 3. Add your new edited message and the new AI answer to the list
    chat.messages.push({ role: "user", content: newContent });
    chat.messages.push({ role: "model", content: answer });
    await chat.save();

    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Edit failed" });
  }
};

