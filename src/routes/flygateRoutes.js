import express from "express";
import {validatePNR, confirmOrder} from "../controllers/flygateController.js";

const router = express.Router();
router.post("/validate", validatePNR);
router.post("/confirm", confirmOrder);

export default router;