import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

const register = async (req, res) => {
    console.log("Register endpoint hit");
    const { name, email, password } = req.body;
    const userExists = await prisma.user.findUnique({
        where: { email: email }
    });
    if (userExists) {
        return res.status(400).json({ message: "User already exists" });
    }
    //Hashing password before storing is recommended, but for simplicity, we are storing it as plain text (NOT RECOMMENDED FOR PRODUCTION)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create user in the database
    const user = await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword
        }
    });
    if (user) {
        return res.status(201).json({ 
            status: "success",
            data: user,
            message: "User created successfully"
         });
    }

      //Generate Token
    const token = generateToken(user.id);
    // const token = generateToken(user.id, res);
    
    return res.status(500).json({ 
        status: "error",
        data: null,
        message: "Something went wrong"
     });
    //body should contain username and password and it's object
    res.json(body);
};
console.log("Auth controller loaded");

const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ 
        where: { email: email }
    });
    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    //verify password 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
    }  
    
    //Generate Token
    const token = generateToken(user.id);

    return res.status(200).json({
        status: "success",
        data: user,
        message: "Login successful"
    });
};


const logout = async (req, res) => {
    res.cookie("jwt", "",{
        httpOnly: true,
        expires: new Date(0),
    })
    res.status(200).json({
        status: "Success",
        message: "Logout successfully",
    });
};


export { register, login, logout };