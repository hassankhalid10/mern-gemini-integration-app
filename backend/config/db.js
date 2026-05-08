/**
 * Database Connection
 * 
 * This file handles the connection to MongoDB, which is like a giant 
 * filing cabinet where all your chats and user info are safely stored.
 */

import mongoose from "mongoose";


export const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};
