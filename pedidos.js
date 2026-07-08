const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { isLoggedIn } = require('../middleware/auth');

// ===== CREAR UN PEDIDO (formulario de compra del usuario) =====
router.post('/', isLoggedIn, async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, metodopago } = req.body;
    // items = [{ producto_nombre, precio, talla, cantidad }, ...]

    if (!items || items.length === 0) {
      return res.status(400).json({ msg: 'El carrito está vacío' });
    }
    if (!metodopago) {
      return res.status(400).json({ msg: 'Debes seleccionar un método de pago' });
    }

    const usuarioId = req.user.id;
    const pedidoId = uuidv4();
    const total = items.reduce((sum, i) => sum + Number(i.precio) * Number(i.cantidad), 0);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO pedidos (pedidoid, usuario_id, metodopago, total, fecha_pedido, estado)
       VALUES ($1, $2, $3, $4, NOW(), 'pendiente')`,
      [pedidoId, usuarioId, metodopago, total]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO detallespedido (pedidoid, producto_nombre, precio, talla, cantidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.producto_nombre, item.precio, item.talla, item.cantidad]
      );
    }

    await client.query('COMMIT');
    res.json({ msg: 'Compra realizada con éxito', pedidoId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ msg: 'Error al procesar la compra' });
  } finally {
    client.release();
  }
});

// ===== VER MIS PEDIDOS (usuario logueado) =====
router.get('/mis-pedidos', isLoggedIn, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pedidos = await pool.query(
      `SELECT * FROM pedidos WHERE usuario_id = $1 ORDER BY fecha_pedido DESC`,
      [usuarioId]
    );
    res.json(pedidos.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener tus pedidos' });
  }
});

// ===== VER EL DETALLE DE UNO DE MIS PEDIDOS =====
router.get('/mis-pedidos/:pedidoid', isLoggedIn, async (req, res) => {
  try {
    const { pedidoid } = req.params;
    const usuarioId = req.user.id;

    const pedido = await pool.query(
      `SELECT * FROM pedidos WHERE pedidoid = $1 AND usuario_id = $2`,
      [pedidoid, usuarioId]
    );
    if (pedido.rows.length === 0) {
      return res.status(404).json({ msg: 'Pedido no encontrado' });
    }

    const detalles = await pool.query(
      `SELECT * FROM detallespedido WHERE pedidoid = $1`,
      [pedidoid]
    );

    res.json({ pedido: pedido.rows[0], productos: detalles.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener el detalle del pedido' });
  }
});

module.exports = router;
