// routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

// =========================
// Helper - Generate JWT
// =========================
function generateToken(user, role = "customer") {
  return jwt.sign(
    { id: user.customer_id || user.admin_id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// =========================
// Customer Registration
// =========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, address, dob, password } = req.body;

    // Check if email exists
    const [existing] = await pool.query("SELECT * FROM customers WHERE email=?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO customers (name, email, phone, address, dob, password_hash) VALUES (?,?,?,?,?,?)",
      [name, email, phone, address, dob, hash]
    );

    res.json({ customer_id: result.insertId, name, email });
  } catch (err) {
    console.error("Error registering customer", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Customer Login
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query("SELECT * FROM customers WHERE email=?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const customer = rows[0];
    const match = await bcrypt.compare(password, customer.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(customer, "customer");
    res.json({ token });
  } catch (err) {
    console.error("Error logging in customer", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin Registration
// =========================
router.post("/admin/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const [existing] = await pool.query("SELECT * FROM admins WHERE email=?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO admins (name, email, password_hash) VALUES (?,?,?)",
      [name, email, hash]
    );

    res.json({ admin_id: result.insertId, name, email });
  } catch (err) {
    console.error("Error registering admin", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin Login
// =========================
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query("SELECT * FROM admins WHERE email=?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(admin, "admin");
    res.json({ token });
  } catch (err) {
    console.error("Error logging in admin", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
