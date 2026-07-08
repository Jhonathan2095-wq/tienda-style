const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /api/admin/lista (usuarios con rol admin)
router.get('/lista', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, correo, TO_CHAR(fecha_registro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'DD/MM/YYYY') AS fecha_registro
      FROM usuarios WHERE rol = 'admin' ORDER BY fecha_registro ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener administradores' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const productos = await pool.query('SELECT COUNT(*) FROM productos WHERE activo = 1');
    const pedidos = await pool.query('SELECT COUNT(*) FROM pedidos');
    const usuarios = await pool.query('SELECT COUNT(*) FROM usuarios');
    const ventas = await pool.query('SELECT COALESCE(SUM(total),0) AS total FROM pedidos');
    const ventasMes = await pool.query(`
      SELECT COALESCE(SUM(total),0) AS total FROM pedidos
      WHERE date_trunc('month', fecha_pedido) = date_trunc('month', NOW())
    `);

    res.json({
      total_productos: parseInt(productos.rows[0].count, 10),
      total_pedidos: parseInt(pedidos.rows[0].count, 10),
      total_usuarios: parseInt(usuarios.rows[0].count, 10),
      ventas_totales: parseFloat(ventas.rows[0].total),
      ventas_mes: parseFloat(ventasMes.rows[0].total)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
