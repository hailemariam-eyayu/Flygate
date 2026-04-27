import express, { Router } from "express";

const router = Router(); // ✅ CRITICAL: Must initialize the router instance

// Signup Route
router.post("/Signup", (req, res) => { // Using POST is better practice for sending data
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    } else if (username.length < 3 || password.length < 6) {
        return res.status(400).json({ message: "Invalid length: Username(3+) Password(6+)" });
    }

    if (username === "admin" && password === "admin123") {
        return res.status(200).json({ message: "Signup successful" });
    } 
    
    return res.status(401).json({ message: "Invalid credentials" });
    // ❌ Removed: res.json({ message: "Hello Router" }); (This was unreachable after return)
});

// Login Route
router.post("/Login", (req, res) => {  
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    } else if (username === "admin" && password === "admin123") {
        return res.status(200).json({ message: "Login successful" });
    } 
    
    return res.status(401).json({ message: "Invalid credentials" });
});

export default router;
