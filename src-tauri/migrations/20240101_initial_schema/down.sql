-- Drop indexes
DROP INDEX IF EXISTS idx_pagos_venta_id;
DROP INDEX IF EXISTS idx_venta_items_producto_id;
DROP INDEX IF EXISTS idx_venta_items_venta_id;
DROP INDEX IF EXISTS idx_categorias_padre_id;
DROP INDEX IF EXISTS idx_producto_fotos_producto_id;
DROP INDEX IF EXISTS idx_productos_categoria_id;

-- Drop payments
DROP TABLE IF EXISTS pagos;

-- Drop sale items
DROP TABLE IF EXISTS venta_items;

-- Drop sales
DROP TABLE IF EXISTS ventas;

-- Drop junction table first
DROP TABLE IF EXISTS producto_etiquetas;

-- Drop tags table
DROP TABLE IF EXISTS etiquetas;

-- Drop product photos
DROP TABLE IF EXISTS producto_fotos;

-- Drop products
DROP TABLE IF EXISTS productos;

-- Drop categories last
DROP TABLE IF EXISTS categorias;
