use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// Sale model
#[derive(Serialize, Debug, Clone, FromRow)]
pub struct Venta {
    pub id: i32,
    pub fecha: String,
    pub estado: String,
    pub total: f64,
    pub observaciones: Option<String>,
    pub cliente_nombre: Option<String>,
    pub cliente_domicilio: Option<String>,
    pub cliente_localidad: Option<String>,
    pub cliente_telefono: Option<String>,
    pub archivado: bool,
}

// Sale item model
#[derive(Serialize, Debug, Clone, FromRow)]
pub struct VentaItem {
    pub id: i32,
    pub venta_id: i32,
    pub producto_id: i32,
    pub cantidad: i32,
    pub entregado: i32,
    pub fecha_entrega: Option<String>,
    pub estado: String,
    pub producto_nombre: Option<String>,  // Product name from join
    pub costo: Option<f64>,              // Unit price from products table
    pub subtotal: Option<f64>,           // Calculated subtotal (costo * cantidad)
}

// DTO for creating a sale
#[derive(Deserialize, Debug)]
pub struct CrearVenta {
    pub items: Vec<VentaItemCrear>,
    pub observaciones: Option<String>,
    pub cliente_nombre: Option<String>,
    pub cliente_domicilio: Option<String>,
    pub cliente_localidad: Option<String>,
    pub cliente_telefono: Option<String>,
}

// DTO for creating sale items
#[derive(Deserialize, Debug)]
pub struct VentaItemCrear {
    pub producto_id: i32,
    pub cantidad: i32,
    pub precio_modificado: Option<f64>, // Modified price for this item
}

// Response for sale creation
#[derive(Serialize, Debug)]
pub struct VentaResponse {
    pub venta: Venta,
    pub items: Vec<VentaItem>,
}

// Paginated response for the Historial screen
#[derive(Serialize, Debug)]
pub struct SalesHistoryResponse {
    pub data: Vec<VentaResponse>,
    pub total: i64,
}
