// Sale model
export interface Venta {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  observaciones?: string;
  cliente_nombre?: string;
  cliente_domicilio?: string;
  cliente_localidad?: string;
  cliente_telefono?: string;
  archivado: boolean;
}

// Sale item model
export interface VentaItem {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  entregado: number;
  fecha_entrega?: string;
  estado: string;
  producto_nombre?: string;  // Product name from join
  costo?: number;           // Unit price from products table
  subtotal?: number;        // Calculated subtotal (costo * cantidad)
}

// DTO for creating a sale
export interface CrearVenta {
  items: VentaItemCrear[];
  observaciones?: string;
  cliente_nombre?: string;
  cliente_domicilio?: string;
  cliente_localidad?: string;
  cliente_telefono?: string;
}

// DTO for creating sale items
export interface VentaItemCrear {
  producto_id: number;
  cantidad: number;
}

// Response for sale creation
export interface VentaResponse {
  venta: Venta;
  items: VentaItem[];
}

// Cart item for POS
export interface CartItem {
  producto_id: number;
  nombre: string;
  costo: number;
  costo_modificado?: number; // Modified price for this item
  cantidad: number;
  stock: number;
}

// Product for search (from catalogue)
export interface Producto {
  id: number;
  nombre: string;
  costo: number;
  stock?: number;
}
