const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAdmin } = require('../middleware/auth');

// ===== VER TODOS LOS PEDIDOS (panel admin) =====
router.get('/pedidos', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.pedidoid, p.total, p.metodopago, p.estado, p.fecha_pedido,
             u.nombre AS usuario, u.correo
      FROM pedidos p
      JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.fecha_pedido DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener los pedidos' });
  }
});

// ===== VER EL DETALLE DE UN PEDIDO ESPECÍFICO (panel admin) =====
router.get('/pedidos/:pedidoid', isAdmin, async (req, res) => {
  try {
    const { pedidoid } = req.params;

    const pedido = await pool.query(`
      SELECT p.*, u.nombre AS usuario, u.correo
      FROM pedidos p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.pedidoid = $1
    `, [pedidoid]);

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

// ===== CAMBIAR EL ESTADO DE UN PEDIDO (panel admin) =====
router.put('/pedidos/:pedidoid/estado', isAdmin, async (req, res) => {
  try {
    const { pedidoid } = req.params;
    const { estado } = req.body; // 'pendiente', 'enviado', 'entregado', 'cancelado'

    const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ msg: 'Estado no válido' });
    }

    await pool.query('UPDATE pedidos SET estado = $1 WHERE pedidoid = $2', [estado, pedidoid]);
    res.json({ msg: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar el estado' });
  }
});

// ===== VER TODOS LOS USUARIOS (panel admin) =====
router.get('/usuarios', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, correo, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener los usuarios' });
  }
});

// ===== CREAR UN PRODUCTO (panel admin) =====
router.post('/productos', isAdmin, async (req, res) => {
  try {
    const { nombre, precio, categoria, tallas, imagen } = req.body;
    const result = await pool.query(
      `INSERT INTO productos (nombre, precio, categoria, tallas, imagen, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, $5, 1, NOW()) RETURNING *`,
      [nombre, precio, categoria, tallas, imagen]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al crear el producto' });
  }
});

// ===== EDITAR UN PRODUCTO (panel admin) =====
router.put('/productos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, categoria, tallas, imagen, activo } = req.body;
    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, precio = $2, categoria = $3, tallas = $4, imagen = $5, activo = $6
       WHERE id = $7 RETURNING *`,
      [nombre, precio, categoria, tallas, imagen, activo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar el producto' });
  }
});

// ===== DESACTIVAR (eliminar lógicamente) UN PRODUCTO =====
router.delete('/productos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE productos SET activo = 0 WHERE id = $1', [id]);
    res.json({ msg: 'Producto desactivado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al desactivar el producto' });
  }
});

module.exports = router;
