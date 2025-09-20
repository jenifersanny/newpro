// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import staffRoutes from "./routes/staff.js";
import cartRoutes from "./routes/cart.js";

dotenv.config();
const app = express();

// ======================
// Middleware
// ======================
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// ======================
// Health Check
// ======================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ======================
// Routes
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/cart", cartRoutes);

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ YUFUNANEC backend (MySQL) running at http://localhost:${PORT}`);
});
