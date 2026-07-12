export interface Producto {
    id: number;
    nombre: string;
    descripcion?: string;
    costo: number;            // Selling price (what the POS charges)
    precio_compra?: number;   // True purchase cost (optional)
    fotos: string[];
    stock: number;
    categoria_id?: number;
    tags?: string;
}

export interface Categoria {
    id: number;
    nombre: string;
    descripcion?: string;
    categoria_padre_id?: number;
}

export interface CategoriaConHijos extends Categoria {
    hijos?: CategoriaConHijos[];
    nivel: number;
}

export interface ProductoResponse {
    data: Producto[];
    total: number;
    lowStock: number;
    outOfStock: number;
}

export interface CrearProducto {
    nombre: string;
    descripcion?: string;
    costo: number;
    precio_compra?: number;
    fotos: string[];
    stock?: number;
    categoria_id?: number;
    tags?: string;
}

export interface ActualizarProducto {
    id: number;
    nombre: string;
    descripcion?: string;
    costo: number;
    precio_compra?: number;
    fotos: string[];
    stock: number;
    categoria_id?: number;
    tags?: string;
}

export interface CrearCategoria {
    nombre: string;
    descripcion?: string;
    categoria_padre_id?: number;
}

export interface ActualizarCategoria {
    id: number;
    nombre: string;
    descripcion?: string;
    categoria_padre_id?: number;
}
