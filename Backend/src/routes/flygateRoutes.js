import express from "express";
import {validatePNR, confirmOrder, refundRequest} from "../controllers/flygateController.js";

const router = express.Router();
router.post("/validatePNR", validatePNR);
router.post("/confirm", confirmOrder);
router.post("/refund", refundRequest);
export default router;