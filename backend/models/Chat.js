import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true }
});

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: "New Chat" },
  messages: [messageSchema]
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
