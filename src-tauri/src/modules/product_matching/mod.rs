// Product Matching Module
// Handles importing price lists from suppliers and matching them with internal products

pub mod models;
pub mod parser;
pub mod embeddings;
pub mod service;
pub mod commands;
pub mod db;

// Re-export models for easier access
pub use models::*;

// Re-export commands for the registry
pub use commands::*;

#[allow(dead_code)]
pub fn init_module() -> Result<(), Box<dyn std::error::Error>> {
    println!("Initializing Product Matching module...");
    Ok(())
}
