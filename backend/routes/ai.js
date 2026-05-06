import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { 
  askQuestion, 
  getHistory, 
  getChatDetails, 
  deleteChat, 
  renameChat, 
  togglePin, 
  regenerateResponse, 
  editMessage 
} from "../controllers/aiController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/history", getHistory);
router.post("/ask", askQuestion);
router.post("/regenerate", regenerateResponse);
router.post("/edit", editMessage);
router.get("/chat/:id", getChatDetails);
router.delete("/chat/:id", deleteChat);
router.patch("/chat/:id/rename", renameChat);
router.patch("/chat/:id/pin", togglePin);

export default router;
