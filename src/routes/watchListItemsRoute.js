import express from "express";
import { login, logout, register } from "../controllers/AuthController.js";
import {addToWatchList} from "../controllers/watchListItemsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router(); // ✅ CRITICAL: Must initialize the router instance

// Signup Route
console.log("watchlist routes loaded");
// router.use(authMiddleware);
router.post("/", addToWatchList);
// router.post("/", authMiddleware, addToWatchList);
// 


export default router;