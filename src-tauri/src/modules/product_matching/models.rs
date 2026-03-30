use serde::{Deserialize, Serialize};

/// Represents a product from the supplier's price list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductoProveedor {
    pub nombre: String,
    pub precio: Option<f64>,
    pub codigo: Option<String>,
    pub cantidad: Option<i32>,
}

/// Represents a product from the internal database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductoInterno {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    pub stock: i32,
    pub categoria_id: Option<i32>,
    pub tags: Option<String>,
}

/// Result of matching a supplier product with an internal product
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchingResultado {
    pub id: Option<i32>,
    pub importacion_id: i32,
    pub producto_proveedor_nombre: String,
    pub producto_proveedor_precio: Option<f64>,
    pub producto_proveedor_cantidad: Option<i32>,
    pub producto_interno_id: Option<i32>,
    pub producto_interno_nombre: Option<String>,
    pub score_similitud: f64,
    pub estado: MatchingEstado,
}

/// Status of a matching result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MatchingEstado {
    Pendiente,
    Confirmado,
    Rechazado,
    SinMatch,
}

impl Default for MatchingEstado {
    fn default() -> Self {
        MatchingEstado::Pendiente
    }
}

impl std::fmt::Display for MatchingEstado {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MatchingEstado::Pendiente => write!(f, "pendiente"),
            MatchingEstado::Confirmado => write!(f, "confirmado"),
            MatchingEstado::Rechazado => write!(f, "rechazado"),
            MatchingEstado::SinMatch => write!(f, "sin_match"),
        }
    }
}

/// Import session from a supplier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Importacion {
    pub id: Option<i32>,
    pub proveedor_nombre: String,
    pub archivo_original: String,
    pub fecha_importacion: String,
    pub estado: ImportacionEstado,
    pub total_productos: i32,
    pub productos_emparajados: i32,
}

/// Status of an import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImportacionEstado {
    Pendiente,
    Procesando,
    Completada,
    Error,
}

impl std::fmt::Display for ImportacionEstado {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportacionEstado::Pendiente => write!(f, "pendiente"),
            ImportacionEstado::Procesando => write!(f, "procesando"),
            ImportacionEstado::Completada => write!(f, "completada"),
            ImportacionEstado::Error => write!(f, "error"),
        }
    }
}

/// Request to import a price list file
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct ImportarListaRequest {
    pub proveedor_nombre: String,
    pub archivo_contenido: Vec<u8>,
    pub nombre_archivo: String,
}

/// Request to execute matching
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct EjecutarMatchingRequest {
    pub importacion_id: i32,
    pub threshold_automatico: Option<f64>,
    pub threshold_revision: Option<f64>,
}

/// Request to confirm a match
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmarMatchRequest {
    pub resultado_id: i32,
    pub producto_interno_id: i32,
}

/// Statistics about matching results
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchingStats {
    pub total: i32,
    pub automaticos: i32,
    pub pendientes: i32,
    pub confirmados: i32,
    pub rechazados: i32,
    pub sin_match: i32,
}

/// Result of applying price updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActualizacionPreciosResult {
    pub total_confirmados: i32,
    pub actualizados: i32,
    pub errores: Vec<String>,
}

/// Result of reimporting prices from Excel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReimportarPreciosResult {
    pub total_procesados: i32,
    pub actualizados: i32,
    pub errores: Vec<String>,
}
