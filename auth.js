const jwt = require('jsonwebtoken');

// Verifica que el usuario tenga un token válido
function isLoggedIn(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'No autenticado' });

  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ msg: 'Token no proporcionado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ msg: 'Token inválido o expirado' });
    req.user = decoded; // { id, correo, rol }
    next();
  });
}

// Verifica que además de estar logueado, sea administrador
function isAdmin(req, res, next) {
  isLoggedIn(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ msg: 'Acceso denegado: se requiere rol de administrador' });
    }
    next();
  });
}

module.exports = { isLoggedIn, isAdmin };
