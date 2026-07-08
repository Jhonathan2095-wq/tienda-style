require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./auth');
const productosRoutes = require('./productos');
const pedidosRoutes = require('./pedidos');
const usuariosRoutes = require('./usuarios');
const adminRoutes = require('./admin');

// authRoutes ya define /login, /registrar, /forgot-password, /reset-password
app.use('/api', authRoutes);

// pedidosRoutes ya define /checkout, /pedidos, /pedidos/:id/detalle
app.use('/api', pedidosRoutes);

app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/admin', adminRoutes);

// El index.html y las imágenes están en la raíz del proyecto (no en /public)
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
