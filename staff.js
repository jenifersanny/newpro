// routes/staff.js
import express from "express";
import pool from "../db.js";
import { adminMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// =====================
// Get all staff
// =====================
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM staff ORDER BY created_at DESC");
    res.json({ staff: rows });
  } catch (err) {
    console.error("Error fetching staff", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// Add staff
// =====================
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [result] = await pool.query(
      "INSERT INTO staff (name,email,role) VALUES (?,?,?)",
      [name, email, role]
    );
    res.json({ staff_id: result.insertId, name, email, role });
  } catch (err) {
    console.error("Error adding staff", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// Delete staff
// =====================
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM staff WHERE staff_id=?", [req.params.id]);
    res.json({ message: "Staff deleted" });
  } catch (err) {
    console.error("Error deleting staff", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
