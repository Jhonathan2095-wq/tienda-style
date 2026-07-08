const express = require('express');
const router = express.Router();
const pool = require('../db');

// ===== LISTAR TODOS LOS PRODUCTOS ACTIVOS =====
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY fecha_registro DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener productos' });
  }
});

// ===== BUSCAR PRODUCTOS (por nombre o categoría) =====
router.get('/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT * FROM productos
       WHERE activo = 1
       AND (nombre ILIKE $1 OR categoria ILIKE $1)
       ORDER BY nombre ASC
       LIMIT 30`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al buscar productos' });
  }
});

// ===== VER UN PRODUCTO ESPECÍFICO =====
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener el producto' });
  }
});

module.exports = router;
