-- Ejecuta esto en la consola de tu base de datos Postgres en Railway
-- (donde antes ejecutaste SELECT * FROM productos)
-- Es seguro volver a ejecutarlo aunque ya hayas corrido una parte antes (usa IF NOT EXISTS).

-- 1) Agregar estado a los pedidos (pendiente, enviado, entregado, cancelado)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- 2) Agregar columnas para la recuperación de contraseña por correo
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- 3) Datos de entrega del pedido (nombre, teléfono, dirección)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nombre_entrega VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefono_entrega VARCHAR(30);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;

-- 4) (Opcional pero recomendado) índice para que la búsqueda de productos sea más rápida
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos USING gin (nombre gin_trgm_ops);
-- Si el índice anterior da error, es porque falta la extensión pg_trgm. Puedes omitirlo,
-- la búsqueda funcionará igual, solo un poco más lenta con muchísimos productos.
