import { generateToken } from "../src/utils/generateToken.js";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("generateToken Utility", () => {
    it("should generate a valid JWT token for a given userId", () => {
        const userId = "user123";
        const mockToken = "mock.jwt.token";
        
        jwt.sign.mockReturnValue(mockToken);

        const token = generateToken(userId);

        expect(jwt.sign).toHaveBeenCalledWith({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        expect(token).toBe(mockToken);
    });
});