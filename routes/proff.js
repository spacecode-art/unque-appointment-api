import express from "express";
import { setAvailability, updateAvailability, cancelAppointments } from "../controllers/proff.js";
import { authMiddleware } from "../middleware/auth.js"; 
import { profMiddleware } from "../middleware/auth.js"; 
const router = express.Router();


router.post("/availability", authMiddleware,profMiddleware, setAvailability);
// Change the timing of a free slot without deleting it
router.patch("/availability/:slotId", authMiddleware, profMiddleware, updateAvailability);

// Route to cancel appointments between professor and student - Only accessible to professors
router.patch("/cancel-appointments/:studentId", authMiddleware, profMiddleware, cancelAppointments);

export default router;
