export interface Producto {
    id: number;
    nombre: string;
    descripcion?: string;
    costo: number;
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
