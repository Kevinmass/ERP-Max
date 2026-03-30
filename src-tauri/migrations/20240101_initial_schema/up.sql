-- Create categories table
CREATE TABLE categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_padre_id INTEGER,
    FOREIGN KEY (categoria_padre_id) REFERENCES categorias (id) ON DELETE SET NULL
);

-- Create products table
CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    costo REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    categoria_id INTEGER,
    tags TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE SET NULL
);

-- Create product photos table
CREATE TABLE producto_fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    contenido_base64 TEXT NOT NULL,
    orden INTEGER NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
);

-- Create tags table
CREATE TABLE etiquetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- Create product-tags junction table
CREATE TABLE producto_etiquetas (
    producto_id INTEGER NOT NULL,
    etiqueta_id INTEGER NOT NULL,
    PRIMARY KEY (producto_id, etiqueta_id),
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
    FOREIGN KEY (etiqueta_id) REFERENCES etiquetas (id) ON DELETE CASCADE
);

-- Create sales table
CREATE TABLE ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    estado TEXT NOT NULL,
    total REAL NOT NULL,
    observaciones TEXT,
    cliente_nombre TEXT,
    cliente_domicilio TEXT,
    cliente_localidad TEXT,
    cliente_telefono TEXT
);

-- Create sale items table
CREATE TABLE venta_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    entregado INTEGER NOT NULL DEFAULT 0,
    fecha_entrega TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Create payments table
CREATE TABLE pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL,
    metodo TEXT,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX idx_producto_fotos_producto_id ON producto_fotos(producto_id);
CREATE INDEX idx_categorias_padre_id ON categorias(categoria_padre_id);
CREATE INDEX idx_venta_items_venta_id ON venta_items(venta_id);
CREATE INDEX idx_venta_items_producto_id ON venta_items(producto_id);
CREATE INDEX idx_pagos_venta_id ON pagos(venta_id);
