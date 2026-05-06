import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getMemory, updateMemory, deleteMemoryItem } from "../controllers/memoryController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMemory);
router.patch("/", updateMemory);
router.delete("/:category/:key", deleteMemoryItem);

export default router;
