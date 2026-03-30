// Shared utilities for the ERP application
// This includes database connections, logging, and common types

pub mod db;
pub mod migration;
pub mod modules;

// Re-export modules for easier access
pub use modules::*;

// Re-export migration functions for direct access
pub use migration::{run_migration_if_needed, test_migration_system};
