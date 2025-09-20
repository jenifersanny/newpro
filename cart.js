// routes/carts.js
import express from "express";
import pool from "../db.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// =====================
// Get my cart
// =====================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const customerId = req.user.id;

    // Ensure customer has a cart
    let [carts] = await pool.query("SELECT * FROM carts WHERE customer_id=?", [customerId]);
    let cartId;

    if (carts.length === 0) {
      const [cartRes] = await pool.query(
        "INSERT INTO carts (customer_id) VALUES (?)",
        [customerId]
      );
      cartId = cartRes.insertId;
    } else {
      cartId = carts[0].cart_id;
    }

    // Get cart items
    const [items] = await pool.query(
      `SELECT ci.cart_item_id, ci.quantity, p.product_id, p.name, p.price, p.image_url 
       FROM cart_items ci 
       JOIN products p ON ci.product_id=p.product_id 
       WHERE ci.cart_id=?`,
      [cartId]
    );

    res.json({ cart_id: cartId, items });
  } catch (err) {
    console.error("Error loading cart", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// Add item to cart
// =====================
router.post("/items", authMiddleware, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { product_id, quantity } = req.body;

    // Ensure customer has a cart
    let [carts] = await pool.query("SELECT * FROM carts WHERE customer_id=?", [customerId]);
    let cartId;

    if (carts.length === 0) {
      const [cartRes] = await pool.query(
        "INSERT INTO carts (customer_id) VALUES (?)",
        [customerId]
      );
      cartId = cartRes.insertId;
    } else {
      cartId = carts[0].cart_id;
    }

    // Check if product already in cart
    const [existing] = await pool.query(
      "SELECT * FROM cart_items WHERE cart_id=? AND product_id=?",
      [cartId, product_id]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE cart_items SET quantity=quantity+? WHERE cart_id=? AND product_id=?",
        [quantity, cartId, product_id]
      );
    } else {
      await pool.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?,?,?)",
        [cartId, product_id, quantity]
      );
    }

    res.json({ message: "Item added to cart" });
  } catch (err) {
    console.error("Error adding to cart", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// Remove item from cart
// =====================
router.delete("/items/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM cart_items WHERE cart_item_id=?", [id]);
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error("Error removing from cart", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
