import express from 'express';
import db from '../db.js';
import { authCustomer, authAdmin } from '../middleware/auth.js';


/**
 * POST /api/orders
 * Body: { cart_id, payment_method (string) }
 * Creates order from cart items inside a DB transaction.
 */
router.post('/', authCustomer, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const customerId = req.user.id;
    // fetch cart and items
    const cartR = await client.query('SELECT cart_id FROM carts WHERE customer_id=$1', [customerId]);
    if(cartR.rows.length === 0) return res.status(400).json({ error: 'Cart empty' });
    const cartId = cartR.rows[0].cart_id;
    const itemsRes = await client.query(
      `SELECT ci.product_id, ci.quantity, p.price
       FROM cart_items ci JOIN products p ON ci.product_id = p.product_id
       WHERE ci.cart_id = $1 FOR UPDATE`, [cartId]
    );
    const items = itemsRes.rows;
    if(items.length === 0) return res.status(400).json({ error: 'Cart empty' });

    // compute total
    const total = items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);

    await client.query('BEGIN');

    // insert order
    const orderIns = await client.query(
      `INSERT INTO orders (customer_id, total_amount, status, estimated_delivery_date)
       VALUES ($1,$2,$3,$4) RETURNING order_id, created_at`,
      [customerId, total, 'Paid', new Date(Date.now() + (3 + items.length)*24*60*60*1000)]
    );
    const orderId = orderIns.rows[0].order_id;

    // insert order items
    for(const it of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1,$2,$3,$4)`, [orderId, it.product_id, it.quantity, it.price]
      );
      // decrement product stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE product_id = $2', [it.quantity, it.product_id]);
    }

    // record payment (simulated)
    await client.query(
      `INSERT INTO payments (customer_id, order_id, amount, method, status)
       VALUES ($1,$2,$3,$4,$5)`, [customerId, orderId, total, req.body.payment_method || 'mobile_wallet', 'Success']
    );

    // clear cart items
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    res.status(201).json({ order_id: orderId, total });

  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/orders  (customer will see own orders)
 */
router.get('/', authCustomer, async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ orders: r.rows });
  } catch(err){ next(err); }
});

/**
 * Admin: list all orders
 * GET /api/orders/all
 */
router.get('/all', authAdmin, async (req, res, next) => {
  try {
    const r = await db.query('SELECT o.*, c.email as customer_email FROM orders o JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.created_at DESC');
    res.json({ orders: r.rows });
  } catch(err){ next(err); }
});

module.exports = router;
