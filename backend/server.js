import dotenv from "dotenv";
dotenv.config();   // MUST BE FIRST LINE LOGICALLY

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";

import { connectDB } from "./config/db.js";

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

console.log("API KEY:", process.env.GEMINI_API_KEY);
// console.log("PORT:", process.env.PORT);
// console.log("JWT_SECRET:", process.env.JWT_SECRET);
// console.log("MONGO_URI:", process.env.MONGO_URI);

app.listen(process.env.PORT, () => {
  console.log("Server running on", process.env.PORT);
});