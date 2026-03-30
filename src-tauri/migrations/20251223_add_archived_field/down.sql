-- Remove archived field from ventas table
DROP INDEX IF EXISTS idx_ventas_archivado;
ALTER TABLE ventas DROP COLUMN archivado;

-- Remove archived field from productos table
DROP INDEX IF EXISTS idx_productos_archivado;
ALTER TABLE productos DROP COLUMN archivado;

-- Remove archived field from categorias table
DROP INDEX IF EXISTS idx_categorias_archivado;
ALTER TABLE categorias DROP COLUMN archivado;
