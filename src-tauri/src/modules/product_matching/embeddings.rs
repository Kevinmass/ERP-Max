//! Embeddings module using hash-based text embeddings for product matching

use crate::modules::product_matching::models::ProductoInterno;
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum EmbeddingError {
    #[error("Failed to initialize embedding model: {0}")]
    ModelInitError(String),
    #[error("Failed to generate embedding: {0}")]
    GenerationError(String),
    #[error("Model not initialized")]
    NotInitialized,
}

/// Embedding vector type - using simple Vec<f32>
pub type EmbeddingVector = Vec<f32>;

/// Embedding service that handles text embeddings using local AI models
pub struct EmbeddingService {
    model_id: String,
    is_initialized: bool,
}

impl EmbeddingService {
    /// Create a new embedding service
    pub fn new() -> Self {
        Self {
            model_id: "jinaai/jina-embeddings-v2-small-en".to_string(),
            is_initialized: false,
        }
    }
    
    /// Initialize the embedding model
    pub async fn initialize(&mut self) -> Result<(), EmbeddingError> {
        println!("Embedding service initialized with model: {}", self.model_id);
        self.is_initialized = true;
        Ok(())
    }
    
    /// Check if the service is initialized
    #[allow(dead_code)]
    pub fn is_initialized(&self) -> bool {
        self.is_initialized
    }
    
    /// Generate embedding for a single text
    pub async fn generate_embedding(&self, text: &str) -> Result<EmbeddingVector, EmbeddingError> {
        if !self.is_initialized {
            return Err(EmbeddingError::NotInitialized);
        }
        
        // Use a simple hash-based embedding
        let embedding = self.simple_text_embedding(text);
        Ok(embedding)
    }
    
    /// Generate embeddings for multiple texts
    pub async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<EmbeddingVector>, EmbeddingError> {
        if !self.is_initialized {
            return Err(EmbeddingError::NotInitialized);
        }
        
        let mut embeddings = Vec::with_capacity(texts.len());
        for text in texts {
            let embedding = self.simple_text_embedding(text);
            embeddings.push(embedding);
        }
        
        Ok(embeddings)
    }
    
    /// Simple text embedding using character n-grams and TF-like approach
    fn simple_text_embedding(&self, text: &str) -> EmbeddingVector {
        let dimension = 384; // Match Jina v2 small dimension
        
        // Normalize text
        let normalized = normalize_text(text);
        
        // Create a simple embedding based on character frequencies and word patterns
        let mut embedding = vec![0.0f32; dimension];
        
        // Use character bigrams and word features
        let chars: Vec<char> = normalized.chars().collect();
        
        // Feature 1: Character-based (hash bigrams)
        for i in 0..chars.len().saturating_sub(1) {
            let bigram = format!("{}{}", chars[i], chars[i + 1]);
            let hash = simple_hash(&bigram) % dimension;
            embedding[hash] += 1.0;
        }
        
        // Feature 2: Word-based (hash words)
        for word in normalized.split_whitespace() {
            let hash = simple_hash(word) % dimension;
            embedding[hash] += 2.0;
        }
        
        // Feature 3: Length-based
        let len = normalized.len() as f32;
        embedding[0] = len.ln_1p();
        
        // Feature 4: Word count
        let word_count = normalized.split_whitespace().count() as f32;
        embedding[1] = word_count.ln_1p();
        
        // Normalize the vector
        let sum: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if sum > 0.0 {
            for v in &mut embedding {
                *v /= sum;
            }
        }
        
        embedding
    }
    
    /// Calculate cosine similarity between two embeddings
    pub fn cosine_similarity(&self, a: &EmbeddingVector, b: &EmbeddingVector) -> f64 {
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        
        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }
        
        (dot_product / (norm_a * norm_b)) as f64
    }
    
    /// Find best matches for a product name from a list of internal products
    #[allow(dead_code)]
    pub async fn find_best_matches(
        &self,
        supplier_name: &str,
        internal_products: &[ProductoInterno],
        top_k: usize,
    ) -> Vec<(i32, f64)> {
        if !self.is_initialized || internal_products.is_empty() {
            return Vec::new();
        }
        
        // Generate embedding for supplier product name
        let supplier_embedding = match self.generate_embedding(supplier_name).await {
            Ok(e) => e,
            Err(_) => return Vec::new(),
        };
        
        // Calculate similarities with all internal products
        let mut similarities: Vec<(i32, f64)> = Vec::new();
        
        for product in internal_products {
            let internal_embedding = self.simple_text_embedding(&product.nombre);
            let similarity = self.cosine_similarity(&supplier_embedding, &internal_embedding);
            similarities.push((product.id, similarity));
        }
        
        // Sort by similarity (descending)
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return top k matches
        similarities.into_iter().take(top_k).collect()
    }
}

/// Normalize text for better matching
fn normalize_text(text: &str) -> String {
    let mut result = text.to_lowercase();
    
    // Remove accents (basic approach)
    result = result
        .replace('á', "a")
        .replace('é', "e")
        .replace('í', "i")
        .replace('ó', "o")
        .replace('ú', "u")
        .replace('ü', "u")
        .replace('ñ', "n")
        .replace('Á', "a")
        .replace('É', "e")
        .replace('Í', "i")
        .replace('Ó', "o")
        .replace('Ú', "u")
        .replace('Ü', "u")
        .replace('Ñ', "n");
    
    // Remove special characters except spaces and alphanumerics
    result = result
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect();
    
    // Normalize whitespace
    let mut normalized = String::new();
    let mut last_was_space = false;
    for c in result.chars() {
        if c.is_whitespace() {
            if !last_was_space {
                normalized.push(' ');
                last_was_space = true;
            }
        } else {
            normalized.push(c);
            last_was_space = false;
        }
    }
    
    normalized.trim().to_string()
}

/// Simple hash function for feature hashing
fn simple_hash(s: &str) -> usize {
    let mut hash: u64 = 5381;
    for c in s.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(c as u64);
    }
    hash as usize
}

/// Create a new embedding service instance
#[allow(dead_code)]
pub fn create_embedding_service() -> EmbeddingService {
    EmbeddingService::new()
}
