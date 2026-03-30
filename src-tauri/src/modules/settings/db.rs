use crate::modules::settings::models::{Setting, SettingsMap};
use sqlx::SqlitePool;
use std::collections::HashMap;

// Get all settings as key-value map
pub async fn get_all_settings(pool: &SqlitePool) -> Result<SettingsMap, sqlx::Error> {
    let settings = sqlx::query_as::<_, Setting>("SELECT key, value FROM settings")
        .fetch_all(pool)
        .await?;

    let mut settings_map = HashMap::new();
    for setting in settings {
        settings_map.insert(setting.key, setting.value);
    }

    Ok(settings_map)
}

// Save settings (upsert all key-value pairs)
pub async fn save_settings(pool: &SqlitePool, settings: SettingsMap) -> Result<(), sqlx::Error> {
    for (key, value) in settings {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .bind(key)
            .bind(value)
            .execute(pool)
            .await?;
    }
    Ok(())
}
