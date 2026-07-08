const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /api/usuarios (clientes con total de pedidos y gasto)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.correo, u.rol,
             TO_CHAR(u.fecha_registro, 'DD/MM/YYYY') AS fecha_registro,
             COUNT(p.pedidoid) AS total_pedidos,
             COALESCE(SUM(p.total), 0) AS total_gastado
      FROM usuarios u
      LEFT JOIN pedidos p ON p.usuario_id = u.id
      GROUP BY u.id
      ORDER BY u.fecha_registro DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener los usuarios' });
  }
});

// PUT /api/usuarios/:id/rol -> { rol: 'admin' | 'cliente' }
router.put('/:id/rol', async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;
    if (!['admin', 'cliente'].includes(rol)) {
      return res.json({ success: false, message: 'Rol no válido' });
    }
    await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error al cambiar el rol' });
  }
});

module.exports = router;
