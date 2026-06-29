-- ============================================================
-- TIENDASTYLE - AJUSTES A LA BD PARA SOPORTAR EL NUEVO AUTH
-- ============================================================

USE TiendaStyle;
GO

-- 1. Ampliar columna contrasena a 255 para guardar el hash bcrypt
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='Usuarios' AND COLUMN_NAME='contrasena'
    AND CHARACTER_MAXIMUM_LENGTH < 255
)
BEGIN
    ALTER TABLE dbo.Usuarios ALTER COLUMN contrasena VARCHAR(255) NOT NULL;
    PRINT 'Columna contrasena ampliada a VARCHAR(255)';
END
ELSE
    PRINT 'contrasena ya tiene el tamaño correcto.';
GO

-- 2. Agregar columna usuario_id a Pedidos (si no existe)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='Pedidos' AND COLUMN_NAME='usuario_id'
)
BEGIN
    ALTER TABLE dbo.Pedidos ADD usuario_id INT NULL
        CONSTRAINT FK_Pedidos_Usuarios FOREIGN KEY REFERENCES dbo.Usuarios(id);
    PRINT 'Columna usuario_id agregada a Pedidos';
END
ELSE
    PRINT 'usuario_id ya existe en Pedidos.';
GO

-- 3. Agregar columna cantidad a DetallesPedido (si no existe)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='DetallesPedido' AND COLUMN_NAME='cantidad'
)
BEGIN
    ALTER TABLE dbo.DetallesPedido ADD cantidad INT NOT NULL DEFAULT 1;
    PRINT 'Columna cantidad agregada a DetallesPedido';
END
ELSE
    PRINT 'cantidad ya existe en DetallesPedido.';
GO

-- 4. Verificar estructura final
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Usuarios','Pedidos','DetallesPedido','Productos')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO

PRINT 'Base de datos lista para el nuevo sistema de auth.';
GO

-- Muestra todos los registros de la tabla Usuarios
SELECT * FROM Usuarios;

-- Muestra todos los registros de la tabla Pedidos
SELECT * FROM Pedidos;

-- Muestra todos los registros de la tabla DetallesPedido
SELECT * FROM DetallesPedido;
-- Verificar que la tabla Usuarios sigue intacta
