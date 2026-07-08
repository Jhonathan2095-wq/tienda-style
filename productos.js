const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY fecha_registro DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener productos' });
  }
});

// GET /api/productos/buscar?q=texto
router.get('/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);
    const result = await pool.query(
      `SELECT * FROM productos
       WHERE activo = 1 AND (nombre ILIKE $1 OR categoria ILIKE $1)
       ORDER BY nombre ASC LIMIT 30`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al buscar productos' });
  }
});

// POST /api/productos/crear
router.post('/crear', async (req, res) => {
  try {
    const { nombre, precio, categoria, tallas, imagen } = req.body;
    if (!nombre || precio == null) {
      return res.json({ success: false, message: 'Nombre y precio son obligatorios' });
    }
    const result = await pool.query(
      `INSERT INTO productos (nombre, precio, categoria, tallas, imagen, activo, fecha_registro)
       VALUES ($1,$2,$3,$4,$5,1,NOW()) RETURNING *`,
      [nombre, precio, categoria, tallas, imagen]
    );
    res.json({ success: true, producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error al crear el producto' });
  }
});

// PUT /api/productos/actualizar/:id
router.put('/actualizar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, categoria, tallas, imagen } = req.body;
    const result = await pool.query(
      `UPDATE productos
       SET nombre=$1, precio=$2, categoria=$3, tallas=$4, imagen=$5
       WHERE id=$6 RETURNING *`,
      [nombre, precio, categoria, tallas, imagen, id]
    );
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error al actualizar el producto' });
  }
});

// DELETE /api/productos/eliminar/:id
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE productos SET activo = 0 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error al eliminar el producto' });
  }
});

module.exports = router;
