-- Add archived field to ventas table
ALTER TABLE ventas ADD COLUMN archivado BOOLEAN DEFAULT 0;

-- Add archived field to productos table
ALTER TABLE productos ADD COLUMN archivado BOOLEAN DEFAULT 0;

-- Add archived field to categorias table
ALTER TABLE categorias ADD COLUMN archivado BOOLEAN DEFAULT 0;

-- Add indexes for better performance when filtering archived records
CREATE INDEX idx_ventas_archivado ON ventas(archivado);
CREATE INDEX idx_productos_archivado ON productos(archivado);
CREATE INDEX idx_categorias_archivado ON categorias(archivado);

-- Update existing records to be active (not archived)
UPDATE ventas SET archivado = 0;
UPDATE productos SET archivado = 0;
UPDATE categorias SET archivado = 0;
