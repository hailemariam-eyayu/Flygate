import jwt from "JsonWebToken";
import { prisma, Prisma } from "../config/db.js";
import { json } from "express";

// read token from endpoint and check validity
export const authMiddleware = async (req, res, next) => {
    console.log("authMiddleware touched.")

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ") // "Bearer" "dsfdskj"
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({ error: "Not authorized, no token" });
    }

    try {
        //verify token and extract userid
        const decoded = jwt.verify(token, process.env, JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            return res.status(401), json({ error: "User no longer exists" });
        }

        req.user = user;
        // then on all request use it as user id
        next();
    } catch (err) {
        return res.status(401), json({ error: "Error" });
    }

};