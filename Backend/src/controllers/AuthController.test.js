import { register, login, logout } from "../src/controllers/AuthController.js";
import { prisma } from "../src/config/db.js";
import bcrypt from "bcryptjs";
import * as tokenUtils from "../src/utils/generateToken.js";

jest.mock("../src/config/db.js", () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));
jest.mock("bcryptjs");
jest.mock("../src/utils/generateToken.js");

describe("AuthController", () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("should return 400 if user already exists", async () => {
            req.body = { email: "test@test.com" };
            prisma.user.findUnique.mockResolvedValue({ id: 1, email: "test@test.com" });

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
        });

        it("should create a user and return 201", async () => {
            req.body = { name: "Test", email: "new@test.com", password: "password123" };
            prisma.user.findUnique.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue("salt");
            bcrypt.hash.mockResolvedValue("hashedPassword");
            prisma.user.create.mockResolvedValue({ id: 2, ...req.body, password: "hashedPassword" });

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
        });
    });

    describe("login", () => {
        it("should return 401 for invalid credentials (user not found)", async () => {
            req.body = { email: "wrong@test.com", password: "pwd" };
            prisma.user.findUnique.mockResolvedValue(null);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it("should return 401 if password does not match", async () => {
            req.body = { email: "test@test.com", password: "wrong" };
            prisma.user.findUnique.mockResolvedValue({ id: 1, password: "hashedPassword" });
            bcrypt.compare.mockResolvedValue(false);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it("should return 200 and a token on successful login", async () => {
            req.body = { email: "test@test.com", password: "correct" };
            const mockUser = { id: 1, name: "Test", email: "test@test.com", password: "hashedPassword" };
            prisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            tokenUtils.generateToken.mockReturnValue("mock-token");

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: "success",
                message: "Login successful"
            }));
        });
    });

    describe("logout", () => {
        it("should clear the jwt cookie and return 200", async () => {
            await logout(req, res);

            expect(res.cookie).toHaveBeenCalledWith("jwt", "", expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ status: "Success", message: "Logout successfully" });
        });
    });
});