// routes/orders.js
import express from "express";
import pool from "../db.js";
import auth from "../middlewares/auth.js";
const {authCustomer, authAdmin} =auth;

const router = express.Router();

// =====================
// Place Order (customer only)
// =====================
router.post("/", authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { payment_method } = req.body;
    const customer_id = req.user.id;

    // Get cart items
    const [cartItems] = await connection.query(
      "SELECT ci.product_id, ci.quantity, p.price FROM cart_items ci JOIN products p ON ci.product_id=p.product_id JOIN carts c ON ci.cart_id=c.cart_id WHERE c.customer_id=?",
      [customer_id]
    );
    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Start transaction
    await connection.beginTransaction();

    // Create order
    const [orderRes] = await connection.query(
      "INSERT INTO orders (customer_id,total_amount,status) VALUES (?,?,?)",
      [customer_id, total, "Pending"]
    );
    const orderId = orderRes.insertId;

    // Insert order items
    for (const item of cartItems) {
      await connection.query(
        "INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES (?,?,?,?)",
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Reduce stock
      await connection.query(
        "UPDATE products SET stock=stock-? WHERE product_id=?",
        [item.quantity, item.product_id]
      );
    }

    // Record payment
    await connection.query(
      "INSERT INTO payments (customer_id,order_id,amount,method,status) VALUES (?,?,?,?,?)",
      [customer_id, orderId, total, payment_method, "Completed"]
    );

    // Clear cart
    await connection.query(
      "DELETE ci FROM cart_items ci JOIN carts c ON ci.cart_id=c.cart_id WHERE c.customer_id=?",
      [customer_id]
    );

    await connection.commit();
    res.json({ order_id: orderId, total, status: "Completed" });
  } catch (err) {
    await connection.rollback();
    console.error("Error placing order", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    connection.release();
  }
});

// =====================
// Get my orders (customer only)
// =====================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM orders WHERE customer_id=?", [req.user.id]);
    res.json({ orders: rows });
  } catch (err) {
    console.error("Error fetching orders", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// Get all orders (admin only)
// =====================
router.get("/all", adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json({ orders: rows });
  } catch (err) {
    console.error("Error fetching all orders", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
