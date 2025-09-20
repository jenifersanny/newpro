// routes/payments.js
import express from "express";
import pool from "../db.js";
import { adminMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// =====================
// Get all payments (admin only)
// =====================
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT p.*, c.email AS customer_email FROM payments p JOIN customers c ON p.customer_id=c.customer_id ORDER BY p.created_at DESC"
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error("Error fetching payments", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
