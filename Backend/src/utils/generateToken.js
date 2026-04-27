import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();

export const generateToken = (userId) => {
const payload = {id: userId};
const token = jwt.sign(payload, process.env.JWT_SECRET,{
    expiresIn: process.env.JWT_EXPIRES_IN,
});


// export const generateTokenAndSetCookie = (userId, res) => {
//     const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRES_IN,
//     });

//     res.cookie("jwt", token, {
//         httpOnly: true, // Prevents XSS attacks
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict", // Prevents CSRF attacks
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
//     });

//     return token;
// };

return token;
};