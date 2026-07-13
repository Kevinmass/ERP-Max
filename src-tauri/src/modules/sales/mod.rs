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
        register_sale,
        get_sales_history,
        delete_sale,
        archive_sale,
        unarchive_sale,
        get_archived_sales,
        get_sales_history_with_filter,
        get_sales_history_page
    ]))
}
