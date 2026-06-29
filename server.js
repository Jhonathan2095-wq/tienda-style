// ============================================================
// STYLE - SERVIDOR BACKEND (Node.js + Express + PostgreSQL)
// ============================================================

const express = require('express');
const { Pool } = require('pg');
const bcrypt  = require('bcryptjs');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── CONFIGURACIÓN POSTGRESQL ───────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function conectarDB() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Conexión exitosa a PostgreSQL');
        await crearTablas();
    } catch (err) {
        console.error('❌ Error BD:', err.message);
        process.exit(1);
    }
}

// ─── CREAR TABLAS SI NO EXISTEN ─────────────────────────────
async function crearTablas() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS Usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100),
            correo VARCHAR(100) UNIQUE NOT NULL,
            contrasena VARCHAR(255) NOT NULL,
            rol VARCHAR(20) DEFAULT 'cliente',
            fecha_registro TIMESTAMP DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS Productos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(200) NOT NULL,
            precio DECIMAL(10,2) NOT NULL,
            categoria VARCHAR(100) DEFAULT '',
            tallas VARCHAR(200) DEFAULT '',
            imagen VARCHAR(500) DEFAULT '',
            activo INTEGER DEFAULT 1,
            fecha_registro TIMESTAMP DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS Pedidos (
            pedidoid VARCHAR(50) PRIMARY KEY,
            metodoPago VARCHAR(50),
            total DECIMAL(10,2),
            fecha_pedido TIMESTAMP DEFAULT NOW(),
            usuario_id INTEGER REFERENCES Usuarios(id)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS DetallesPedido (
            id SERIAL PRIMARY KEY,
            pedidoid VARCHAR(50) REFERENCES Pedidos(pedidoid),
            producto_nombre VARCHAR(100),
            precio DECIMAL(10,2),
            talla VARCHAR(20),
            cantidad INTEGER
        )
    `);
    console.log('✅ Tablas verificadas');
}

// ─── REGISTRO ───────────────────────────────────────────────
app.post('/api/registrar', async (req, res) => {
    const { nombre, correo, contrasena } = req.body;
    if (!nombre || !correo || !contrasena)
        return res.json({ success: false, message: 'Todos los campos son obligatorios.' });
    try {
        const existe = await pool.query('SELECT id FROM Usuarios WHERE correo=$1', [correo.toLowerCase()]);
        if (existe.rows.length > 0)
            return res.json({ success: false, message: 'Ese correo ya está registrado.' });
        const hash = await bcrypt.hash(contrasena, 10);
        await pool.query(
            'INSERT INTO Usuarios (nombre,correo,contrasena,fecha_registro) VALUES ($1,$2,$3,NOW())',
            [nombre, correo.toLowerCase(), hash]
        );
        res.json({ success: true, message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error al registrar usuario' });
    }
});

// ─── LOGIN ──────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        const result = await pool.query(
            "SELECT id,nombre,correo,contrasena,COALESCE(rol,'cliente') AS rol FROM Usuarios WHERE correo=$1",
            [correo.toLowerCase()]
        );
        if (result.rows.length === 0)
            return res.json({ success: false, message: 'Correo o contraseña incorrectos' });
        const usuario = result.rows[0];
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!coincide)
            return res.json({ success: false, message: 'Correo o contraseña incorrectos' });
        res.json({
            success: true,
            message: 'Login exitoso',
            usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error al iniciar sesión' });
    }
});

// ─── ADMIN: LISTAR ADMINISTRADORES ─────────────────────────
app.get('/api/admin/lista', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, correo, COALESCE(rol,'cliente') AS rol,
                   TO_CHAR(fecha_registro,'DD/MM/YYYY') AS fecha_registro
            FROM Usuarios WHERE LOWER(COALESCE(rol,'cliente'))='admin' ORDER BY fecha_registro ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN: CAMBIAR ROL ─────────────────────────────────────
app.put('/api/usuarios/:id/rol', async (req, res) => {
    const { id } = req.params;
    const { rol } = req.body;
    if (!['admin','cliente'].includes(rol))
        return res.status(400).json({ success: false, message: 'Rol inválido' });
    try {
        await pool.query('UPDATE Usuarios SET rol=$1 WHERE id=$2', [rol, id]);
        res.json({ success: true, message: `Rol actualizado a ${rol}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PRODUCTOS: LISTAR ──────────────────────────────────────
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, categoria, precio, tallas, imagen,
                   COALESCE(activo,1) AS activo,
                   TO_CHAR(COALESCE(fecha_registro,NOW()),'DD/MM/YYYY') AS fecha_registro
            FROM Productos ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PRODUCTOS: CREAR ───────────────────────────────────────
app.post('/api/productos/crear', async (req, res) => {
    const { nombre, precio, categoria, tallas, imagen } = req.body;
    if (!nombre || precio === undefined)
        return res.status(400).json({ success: false, message: 'Nombre y precio son obligatorios.' });
    try {
        await pool.query(
            'INSERT INTO Productos (nombre,precio,categoria,tallas,imagen,activo,fecha_registro) VALUES ($1,$2,$3,$4,$5,1,NOW())',
            [nombre, parseFloat(precio), categoria||'', tallas||'', imagen||'']
        );
        res.json({ success: true, message: 'Producto creado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PRODUCTOS: ACTUALIZAR ──────────────────────────────────
app.put('/api/productos/actualizar/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, categoria, tallas, imagen } = req.body;
    try {
        await pool.query(
            'UPDATE Productos SET nombre=$1,precio=$2,categoria=$3,tallas=$4,imagen=$5 WHERE id=$6',
            [nombre, parseFloat(precio), categoria||'', tallas||'', imagen||'', id]
        );
        res.json({ success: true, message: 'Producto actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PRODUCTOS: ELIMINAR ────────────────────────────────────
app.delete('/api/productos/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM Productos WHERE id=$1', [id]);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PEDIDOS: LISTAR ────────────────────────────────────────
app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.pedidoid, p.metodoPago, p.total,
                   TO_CHAR(p.fecha_pedido,'DD/MM/YYYY HH24:MI') AS fecha,
                   COALESCE(u.nombre,'Invitado') AS cliente,
                   COALESCE(u.correo,'-') AS correo_cliente,
                   (SELECT COUNT(*) FROM DetallesPedido d WHERE d.pedidoid=p.pedidoid) AS num_items
            FROM Pedidos p LEFT JOIN Usuarios u ON u.id=p.usuario_id
            ORDER BY p.fecha_pedido DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PEDIDOS: DETALLE ───────────────────────────────────────
app.get('/api/pedidos/:pedidoid/detalle', async (req, res) => {
    const { pedidoid } = req.params;
    try {
        const result = await pool.query(
            'SELECT producto_nombre,talla,cantidad,precio FROM DetallesPedido WHERE pedidoid=$1',
            [pedidoid]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── USUARIOS: LISTAR ───────────────────────────────────────
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nombre, u.correo, COALESCE(u.rol,'cliente') AS rol,
                   TO_CHAR(u.fecha_registro,'DD/MM/YYYY') AS fecha_registro,
                   (SELECT COUNT(*) FROM Pedidos p WHERE p.usuario_id=u.id) AS total_pedidos,
                   COALESCE((SELECT SUM(total) FROM Pedidos p WHERE p.usuario_id=u.id),0) AS total_gastado
            FROM Usuarios u ORDER BY u.fecha_registro DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── DASHBOARD: ESTADÍSTICAS ────────────────────────────────
app.get('/api/admin/stats', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM Productos) AS total_productos,
                (SELECT COUNT(*) FROM Pedidos) AS total_pedidos,
                (SELECT COUNT(*) FROM Usuarios) AS total_usuarios,
                (SELECT COALESCE(SUM(total),0) FROM Pedidos) AS ventas_totales,
                (SELECT COALESCE(SUM(total),0) FROM Pedidos
                 WHERE EXTRACT(MONTH FROM fecha_pedido)=EXTRACT(MONTH FROM NOW())
                   AND EXTRACT(YEAR FROM fecha_pedido)=EXTRACT(YEAR FROM NOW())) AS ventas_mes
        `);
        res.json(r.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── CHECKOUT ───────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
    const { metodoPago, carrito, total, usuario_id } = req.body;
    const pedidoId = 'ST-' + Date.now();
    try {
        await pool.query(
            'INSERT INTO Pedidos (pedidoid,metodoPago,total,fecha_pedido,usuario_id) VALUES ($1,$2,$3,NOW(),$4)',
            [pedidoId, metodoPago, total, usuario_id || null]
        );
        for (const item of carrito) {
            await pool.query(
                'INSERT INTO DetallesPedido (pedidoid,producto_nombre,precio,talla,cantidad) VALUES ($1,$2,$3,$4,$5)',
                [pedidoId, item.name, item.price, item.size, item.qty]
            );
        }
        res.json({ success: true, pedidoId, message: 'Pedido registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error al guardar pedido' });
    }
});

// ─── INICIAR SERVIDOR ───────────────────────────────────────
conectarDB().then(() => {
    app.listen(PORT, () => {
        console.log('======================================');
        console.log(`🚀 Servidor en http://localhost:${PORT}`);
        console.log('======================================');
    });
});
