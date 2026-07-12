use serde::{Deserialize, Serialize};

// Product model
#[derive(Serialize, Debug, Clone)]
pub struct Producto {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,               // Selling price (what the POS charges)
    pub precio_compra: Option<f64>, // True purchase cost (optional; distinct from costo)
    pub fotos: Vec<String>,
    pub stock: i32,
    pub categoria_id: Option<i32>,
    pub tags: Option<String>,
}

// Category model
#[derive(Serialize, Debug, Clone)]
pub struct Categoria {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_padre_id: Option<i32>,
}

// DTOs for creating/updating products
#[derive(Deserialize, Debug)]
pub struct CrearProducto {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    #[serde(default)]
    pub precio_compra: Option<f64>,
    pub fotos: Vec<String>,
    pub stock: Option<i32>,
    pub categoria_id: Option<i32>,
    pub tags: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ActualizarProducto {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    #[serde(default)]
    pub precio_compra: Option<f64>,
    pub fotos: Vec<String>,
    pub stock: i32,
    pub categoria_id: Option<i32>,
    pub tags: Option<String>,
}

// DTOs for categories
#[derive(Deserialize, Debug)]
pub struct CrearCategoria {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_padre_id: Option<i32>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct ActualizarCategoria {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_padre_id: Option<i32>,
}

// Response for products with pagination
#[derive(Serialize, Debug)]
pub struct ProductoResponse {
    pub data: Vec<Producto>,
    pub total: i32,
    #[serde(rename = "lowStock")]
    pub low_stock: i32,
    #[serde(rename = "outOfStock")]
    pub out_of_stock: i32,
}

// Request DTO for product search/filtering
#[derive(Deserialize, Debug)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct GetProductosRequest {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub search_query: Option<String>,
    pub categoria_id: Option<i32>,
}

// Import DTO
#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct ImportarProducto {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    pub stock: i32,
    pub categoria: String,
}

// Product for export (without photos for PDF generation)
#[derive(Serialize, Debug, Clone)]
pub struct ProductoExport {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    pub stock: i32,
    pub categoria_nombre: Option<String>,
    pub tags: Option<String>,
}

// Category with hierarchy level for PDF generation
#[derive(Serialize, Debug, Clone)]
pub struct CategoryWithProducts {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_padre_id: Option<i32>,
    pub level: i32,
    pub productos: Vec<ProductoExport>,
}

// Product for export with category hierarchy info
#[derive(Serialize, Debug, Clone)]
pub struct ProductoExportWithCategory {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    pub stock: i32,
    pub categoria_id: Option<i32>,
    pub categoria_nombre: Option<String>,
    pub categoria_level: i32,
    pub tags: Option<String>,
}
