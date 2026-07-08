const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('./db');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/login  -> { correo, contrasena }
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.json({ success: false, message: 'Correo y contraseña son obligatorios' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Correo o contraseña incorrectos' });
    }

    const usuario = result.rows[0];
    const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!coincide) {
      return res.json({ success: false, message: 'Correo o contraseña incorrectos' });
    }

    res.json({
      success: true,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error del servidor al iniciar sesión' });
  }
});

// POST /api/registrar -> { nombre, correo, contrasena }
router.post('/registrar', async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;
    if (!nombre || !correo || !contrasena) {
      return res.json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const existe = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (existe.rows.length > 0) {
      return res.json({ success: false, message: 'Ese correo ya está registrado' });
    }

    const hashed = await bcrypt.hash(contrasena, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, contrasena, rol, fecha_registro)
       VALUES ($1, $2, $3, 'cliente', NOW())`,
      [nombre, correo, hashed]
    );

    res.json({ success: true, message: 'Cuenta creada correctamente' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error del servidor al registrar' });
  }
});

// POST /api/forgot-password -> { correo }
router.post('/forgot-password', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) {
      return res.json({ success: false, message: 'Ingresa tu correo' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      // Por seguridad no revelamos si el correo existe o no
      return res.json({ success: true, message: 'Si el correo existe, se envió un enlace de recuperación' });
    }

    const usuario = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await pool.query(
      'UPDATE usuarios SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, expires, usuario.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Recupera tu contraseña - STYLE',
      html: `
        <p>Hola ${usuario.nombre},</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña. Expira en 1 hora.</p>
        <a href="${resetLink}">${resetLink}</a>
      `
    });

    res.json({ success: true, message: 'Correo de recuperación enviado' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'No se pudo enviar el correo de recuperación' });
  }
});

// POST /api/reset-password -> { token, contrasena }
router.post('/reset-password', async (req, res) => {
  try {
    const { token, contrasena } = req.body;
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'El enlace es inválido o ha expirado' });
    }

    const usuario = result.rows[0];
    const hashed = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'UPDATE usuarios SET contrasena = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashed, usuario.id]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;
