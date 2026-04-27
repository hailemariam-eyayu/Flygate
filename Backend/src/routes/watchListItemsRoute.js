import express from "express";
import { login, logout, register } from "../controllers/AuthController.js";
import { addToWatchList, removeFromWatchlist, updateWatchlist } from "../controllers/watchListItemsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router(); // ✅ CRITICAL: Must initialize the router instance

// router.use(authMiddleware);
router.post("/", addToWatchList);
// router.post("/", authMiddleware, addToWatchList);
// 
router.delete("/:id", removeFromWatchlist)
router.put("/:id", updateWatchlist)

export default router;

// app.use("/watch", watchlistRoutes);

// app.use("/airline", flygateRoutes);