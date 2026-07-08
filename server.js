require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ===== Middlewares globales =====
app.use(cors());
app.use(express.json());

// ===== Rutas =====
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/admin', adminRoutes);

// ===== Servir el frontend (si tienes React/HTML compilado en /public) =====
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Manejador de errores general =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
