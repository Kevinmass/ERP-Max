-- Create settings table for key-value configuration storage
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Create index for potential future queries
CREATE INDEX idx_settings_key ON settings(key);
