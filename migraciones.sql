-- Ejecuta esto en la consola de tu base de datos Postgres en Railway
-- (donde antes ejecutaste SELECT * FROM productos)

-- 1) Agregar estado a los pedidos (pendiente, enviado, entregado, cancelado)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- 2) Agregar columnas para la recuperación de contraseña por correo
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- 3) (Opcional pero recomendado) índice para que la búsqueda de productos sea más rápida
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos USING gin (nombre gin_trgm_ops);
-- Si el índice anterior da error, es porque falta la extensión pg_trgm. Puedes omitirlo,
-- la búsqueda funcionará igual, solo un poco más lenta con muchísimos productos.
