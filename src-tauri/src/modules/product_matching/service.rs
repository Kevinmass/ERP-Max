//! Product Matching Service - Core business logic

use crate::modules::product_matching::models::*;
use crate::modules::product_matching::parser;
use crate::modules::product_matching::embeddings::EmbeddingService;
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum MatchingError {
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Embedding error: {0}")]
    EmbeddingError(String),
    #[error("Import not found: {0}")]
    ImportNotFound(i32),
}

/// Configuration for matching thresholds
#[derive(Debug, Clone)]
pub struct MatchingConfig {
    pub threshold_automatico: f64,
    pub threshold_revision: f64,
}

impl Default for MatchingConfig {
    fn default() -> Self {
        Self {
            threshold_automatico: 0.85,
            threshold_revision: 0.70,
        }
    }
}

/// Product Matching Service
pub struct ProductMatchingService {
    embedding_service: EmbeddingService,
    config: MatchingConfig,
}

impl ProductMatchingService {
    /// Create a new service instance
    pub fn new() -> Self {
        let embedding_service = EmbeddingService::new();
        
        Self {
            embedding_service,
            config: MatchingConfig::default(),
        }
    }
    
    /// Initialize the service (call once at startup)
    pub async fn initialize(&mut self) -> Result<(), MatchingError> {
        self.embedding_service.initialize()
            .await
            .map_err(|e| MatchingError::EmbeddingError(e.to_string()))
    }
    
    /// Set custom thresholds
    pub fn set_thresholds(&mut self, automatico: f64, revision: f64) {
        self.config.threshold_automatico = automatico;
        self.config.threshold_revision = revision;
    }
    
    /// Parse a supplier price list file
    pub fn parse_file(&self, content: &[u8], filename: &str) -> Result<Vec<ProductoProveedor>, MatchingError> {
        parser::parse_file(content, filename)
            .map_err(|e| MatchingError::ParseError(e.to_string()))
    }
    
    /// Execute the matching algorithm for a list of supplier products
    pub async fn execute_matching(
        &self,
        supplier_products: Vec<ProductoProveedor>,
        internal_products: &[ProductoInterno],
    ) -> Result<Vec<MatchingResultado>, MatchingError> {
        let mut resultados = Vec::new();
        
        // Pre-compute internal product embeddings for efficiency
        let internal_names: Vec<String> = internal_products
            .iter()
            .map(|p| p.nombre.clone())
            .collect();
        
        // Generate embeddings for internal products once
        let internal_embeddings = self.embedding_service
            .generate_embeddings(&internal_names)
            .await
            .map_err(|e| MatchingError::EmbeddingError(e.to_string()))?;
        
        for (_idx, supplier_product) in supplier_products.iter().enumerate() {
            // Generate embedding for supplier product
            let supplier_embedding = match self.embedding_service
                .generate_embedding(&supplier_product.nombre)
                .await
            {
                Ok(e) => e,
                Err(_) => {
                    // If embedding fails, mark as sin match
                    resultados.push(MatchingResultado {
                        id: None,
                        importacion_id: 0, // Will be set by caller
                        producto_proveedor_nombre: supplier_product.nombre.clone(),
                        producto_proveedor_precio: supplier_product.precio,
                        producto_proveedor_cantidad: supplier_product.cantidad,
                        producto_interno_id: None,
                        producto_interno_nombre: None,
                        score_similitud: 0.0,
                        estado: MatchingEstado::SinMatch,
                    });
                    continue;
                }
            };
            
            // Calculate similarity with all internal products
            let mut similarities: Vec<(usize, f64)> = Vec::new();
            
            for (internal_idx, internal_embedding) in internal_embeddings.iter().enumerate() {
                let similarity = self.embedding_service.cosine_similarity(
                    &supplier_embedding,
                    internal_embedding
                );
                similarities.push((internal_idx, similarity));
            }
            
            // Sort by similarity descending
            similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
            
            // Get best match
            if let Some((best_idx, best_score)) = similarities.first() {
                let best_product = &internal_products[*best_idx];
                let estado = self.determine_estado(*best_score);
                
                resultados.push(MatchingResultado {
                    id: None,
                    importacion_id: 0,
                    producto_proveedor_nombre: supplier_product.nombre.clone(),
                    producto_proveedor_precio: supplier_product.precio,
                    producto_proveedor_cantidad: supplier_product.cantidad,
                    producto_interno_id: Some(best_product.id),
                    producto_interno_nombre: Some(best_product.nombre.clone()),
                    score_similitud: *best_score,
                    estado,
                });
            } else {
                resultados.push(MatchingResultado {
                    id: None,
                    importacion_id: 0,
                    producto_proveedor_nombre: supplier_product.nombre.clone(),
                    producto_proveedor_precio: supplier_product.precio,
                    producto_proveedor_cantidad: supplier_product.cantidad,
                    producto_interno_id: None,
                    producto_interno_nombre: None,
                    score_similitud: 0.0,
                    estado: MatchingEstado::SinMatch,
                });
            }
        }
        
        Ok(resultados)
    }
    
    /// Determine the matching status based on similarity score
    fn determine_estado(&self, score: f64) -> MatchingEstado {
        if score >= self.config.threshold_automatico {
            MatchingEstado::Confirmado
        } else if score >= self.config.threshold_revision {
            MatchingEstado::Pendiente
        } else {
            MatchingEstado::SinMatch
        }
    }
    
    /// Calculate statistics for matching results
    pub fn calculate_stats(&self, resultados: &[MatchingResultado]) -> MatchingStats {
        let total = resultados.len() as i32;
        let mut automaticos = 0;
        let mut pendientes = 0;
        let mut confirmados = 0;
        let mut rechazados = 0;
        let mut sin_match = 0;
        
        for r in resultados {
            match r.estado {
                MatchingEstado::Confirmado => {
                    if r.score_similitud >= self.config.threshold_automatico {
                        automaticos += 1;
                    }
                    confirmados += 1;
                }
                MatchingEstado::Pendiente => pendientes += 1,
                MatchingEstado::Rechazado => rechazados += 1,
                MatchingEstado::SinMatch => sin_match += 1,
            }
        }
        
        MatchingStats {
            total,
            automaticos,
            pendientes,
            confirmados,
            rechazados,
            sin_match,
        }
    }
}

impl Default for ProductMatchingService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_service_initialization() {
        let mut service = ProductMatchingService::new();
        service.initialize().await.unwrap();
    }
    
    #[test]
    fn test_thresholds() {
        let mut service = ProductMatchingService::new();
        service.set_thresholds(0.9, 0.8);
        
        assert_eq!(service.config.threshold_automatico, 0.9);
        assert_eq!(service.config.threshold_revision, 0.8);
    }
}
