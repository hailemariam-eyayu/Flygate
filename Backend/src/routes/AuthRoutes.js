import express from "express";
import { login, logout, register } from "../controllers/AuthController.js";

const router = express.Router(); // ✅ CRITICAL: Must initialize the router instance

// Signup Route
console.log("Auth routes loaded");
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);


export default router;