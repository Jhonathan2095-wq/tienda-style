const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

// POST /api/checkout -> { metodoPago, carrito:[{name,size,qty,price}], total, usuario_id }
router.post('/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { metodoPago, carrito, total, usuario_id, nombreEntrega, telefonoEntrega, direccionEntrega } = req.body;

    if (!carrito || !carrito.length) {
      return res.json({ success: false, message: 'El carrito está vacío' });
    }
    if (!nombreEntrega || !telefonoEntrega || !direccionEntrega) {
      return res.json({ success: false, message: 'Faltan los datos de entrega (nombre, teléfono o dirección)' });
    }

    const pedidoId = 'PED-' + uuidv4().slice(0, 8).toUpperCase();

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO pedidos (pedidoid, usuario_id, metodopago, total, fecha_pedido, estado, nombre_entrega, telefono_entrega, direccion_entrega)
       VALUES ($1, $2, $3, $4, NOW(), 'pendiente', $5, $6, $7)`,
      [pedidoId, usuario_id || null, metodoPago, total, nombreEntrega, telefonoEntrega, direccionEntrega]
    );

    for (const item of carrito) {
      await client.query(
        `INSERT INTO detallespedido (pedidoid, producto_nombre, precio, talla, cantidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.name, item.price, item.size || '', item.qty]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, pedidoId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.json({ success: false, message: 'Error al procesar el pedido' });
  } finally {
    client.release();
  }
});

// GET /api/pedidos  (usado por el panel admin)
router.get('/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.pedidoid,
             COALESCE(u.nombre, p.nombre_entrega, 'Invitado') AS cliente,
             COALESCE(u.correo, '') AS correo_cliente,
             TO_CHAR(p.fecha_pedido AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') AS fecha,
             p.metodopago AS "metodoPago",
             p.total,
             p.telefono_entrega,
             p.direccion_entrega,
             (SELECT COUNT(*) FROM detallespedido d WHERE d.pedidoid = p.pedidoid) AS num_items
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.fecha_pedido DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener los pedidos' });
  }
});

// GET /api/pedidos/:pedidoid/detalle
router.get('/pedidos/:pedidoid/detalle', async (req, res) => {
  try {
    const { pedidoid } = req.params;
    const items = await pool.query(
      'SELECT producto_nombre, talla, cantidad, precio FROM detallespedido WHERE pedidoid = $1',
      [pedidoid]
    );
    const entregaResult = await pool.query(
      'SELECT nombre_entrega, telefono_entrega, direccion_entrega FROM pedidos WHERE pedidoid = $1',
      [pedidoid]
    );
    res.json({
      items: items.rows,
      entrega: entregaResult.rows[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener el detalle del pedido' });
  }
});

module.exports = router;
