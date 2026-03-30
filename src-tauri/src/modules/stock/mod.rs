use tauri::{Builder, Runtime};

pub mod models;
pub mod commands;
pub mod service;
pub mod db;

// Re-export commands for the registry
pub use commands::*;

// Function that returns the list of commands for the registry to use
#[allow(dead_code)]
pub fn get_commands<R: Runtime>() -> Box<dyn Fn(Builder<R>) -> Builder<R> + Send> {
    Box::new(|builder| builder.invoke_handler(tauri::generate_handler![
        get_inventory_list,
        update_stock_manually,
        adjust_stock
    ]))
}
