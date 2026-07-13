use sqlx::SqlitePool;
use tauri::State;
use crate::modules::dashboard::db;
use crate::modules::dashboard::{DashboardResponse, KpiConfig, DashboardStats, SalesTrend, InventoryStatus, TopProduct, CategoryRevenue};

#[tauri::command]
pub async fn get_dashboard_data(
    pool: State<'_, SqlitePool>,
) -> Result<DashboardResponse, String> {
    db::get_dashboard_data(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_dashboard_stats(
    pool: State<'_, SqlitePool>,
) -> Result<DashboardStats, String> {
    db::get_dashboard_stats(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sales_trend(
    pool: State<'_, SqlitePool>,
    days: i32,
) -> Result<Vec<SalesTrend>, String> {
    db::get_sales_trend(&pool, days).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_inventory_status(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<InventoryStatus>, String> {
    db::get_inventory_status(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_top_selling_products(
    pool: State<'_, SqlitePool>,
    limit: i32,
) -> Result<Vec<TopProduct>, String> {
    db::get_top_selling_products(&pool, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_revenue_by_category(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<CategoryRevenue>, String> {
    db::get_revenue_by_category(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_kpi_config(
    pool: State<'_, SqlitePool>,
) -> Result<KpiConfig, String> {
    db::get_kpi_config(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_kpi_config(
    pool: State<'_, SqlitePool>,
    config: KpiConfig,
) -> Result<(), String> {
    use crate::modules::settings::service::update_setting;
    
    // Update each setting individually
    update_setting(&pool, "dashboard.show_total_products", if config.show_total_products { "true" } else { "false" }).await?;
    update_setting(&pool, "dashboard.show_today_sales", if config.show_today_sales { "true" } else { "false" }).await?;
    update_setting(&pool, "dashboard.show_low_stock", if config.show_low_stock { "true" } else { "false" }).await?;
    update_setting(&pool, "dashboard.show_active_categories", if config.show_active_categories { "true" } else { "false" }).await?;
    update_setting(&pool, "dashboard.show_total_revenue", if config.show_total_revenue { "true" } else { "false" }).await?;
    update_setting(&pool, "dashboard.show_sales_count", if config.show_sales_count { "true" } else { "false" }).await?;
    
    Ok(())
}