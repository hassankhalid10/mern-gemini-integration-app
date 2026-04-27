import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
  file: {
    mimeType: String,
    data: String, // Base64
    fileName: String
  }
});

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: "New Chat" },
  messages: [messageSchema],
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
