use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Database model for settings table
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

// Type alias for settings data (key-value pairs)
pub type SettingsMap = HashMap<String, String>;

// DTO for updating settings
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SaveSettingsRequest {
    pub settings: SettingsMap,
}
