use crate::modules::settings::db::{get_all_settings, save_settings};
use crate::modules::settings::models::SettingsMap;
use sqlx::SqlitePool;

// Get a specific setting value
pub async fn get_setting(pool: &SqlitePool, key: &str) -> Result<String, String> {
    let result = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get setting: {}", e))?;
    
    result.ok_or_else(|| format!("Setting '{}' not found", key))
}

// Update a specific setting value
pub async fn update_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), String> {
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(key)
        .bind(value)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update setting: {}", e))?;
    Ok(())
}

// Get settings service
pub async fn get_settings_service(pool: &SqlitePool) -> Result<SettingsMap, String> {
    get_all_settings(pool)
        .await
        .map_err(|e| format!("Failed to get settings: {}", e))
}

// Save settings service with basic validation
pub async fn save_settings_service(pool: &SqlitePool, settings: SettingsMap) -> Result<(), String> {
    // Basic validation
    if let Some(theme_name) = settings.get("theme_name") {
        if theme_name != "blue" && theme_name != "green" && theme_name != "purple" && theme_name != "professional" {
            return Err("Invalid theme_name. Must be 'blue', 'green', 'purple', or 'professional'.".to_string());
        }
    }

    if let Some(theme_variant) = settings.get("theme_variant") {
        if theme_variant != "light" && theme_variant != "dark" {
            return Err("Invalid theme_variant. Must be 'light' or 'dark'.".to_string());
        }
    }

    if let Some(tax_rate_str) = settings.get("tax_rate") {
        if tax_rate_str.parse::<f64>().is_err() {
            return Err("Invalid tax_rate. Must be a valid number.".to_string());
        }
    }

    if let Some(font_size) = settings.get("font_size") {
        if font_size != "small" && font_size != "medium" && font_size != "large" {
            return Err("Invalid font_size. Must be 'small', 'medium', or 'large'.".to_string());
        }
    }

    if let Some(language) = settings.get("language") {
        if language != "en" && language != "es" {
            return Err("Invalid language. Must be 'en' or 'es'.".to_string());
        }
    }

    save_settings(pool, settings)
        .await
        .map_err(|e| format!("Failed to save settings: {}", e))
}
