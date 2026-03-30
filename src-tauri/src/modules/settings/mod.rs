pub mod db;
pub mod models;
pub mod service;

use crate::modules::settings::models::SettingsMap;
use crate::modules::settings::service::{get_settings_service, save_settings_service};
use sqlx::SqlitePool;
use tauri::{Builder, Runtime, State};

// Get settings command
#[tauri::command]
pub async fn get_settings(state: State<'_, SqlitePool>) -> Result<SettingsMap, String> {
    get_settings_service(&*state).await
}

// Save settings command
#[tauri::command]
pub async fn save_settings(
    state: State<'_, SqlitePool>,
    settings: SettingsMap,
) -> Result<(), String> {
    save_settings_service(&*state, settings).await
}

// Get commands function for module registry
#[allow(dead_code)]
pub fn get_commands<R: Runtime>() -> Box<dyn FnOnce(Builder<R>) -> Builder<R> + Send> {
    Box::new(|builder| {
        builder.invoke_handler(tauri::generate_handler![get_settings, save_settings])
    })
}
