import { Router } from "express";
import { getTicket, checkIn, rejectTicket, toggleReleaseSlot } from "../controllers/scanner.controller.js";
import { requireAdminToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get ("/scanner/ticket/:id",        requireAdminToken, getTicket);
router.post("/scanner/checkin/:id",       requireAdminToken, checkIn);
router.post("/scanner/reject/:id",        requireAdminToken, rejectTicket);
router.post("/admin/toggle-release-slot", requireAdminToken, toggleReleaseSlot);

export default router;