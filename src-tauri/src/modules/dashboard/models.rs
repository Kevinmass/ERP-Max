use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// Dashboard statistics response
#[derive(Serialize, Debug, FromRow)]
pub struct DashboardStats {
    pub total_products: i32,
    pub today_sales: f64,
    pub low_stock_items: i32,
    pub active_categories: i32,
    pub total_revenue: f64,
    pub sales_count: i32,
}

// Sales trend data for charts
#[derive(Serialize, Debug, FromRow)]
pub struct SalesTrend {
    pub date: String,
    pub total: f64,
    pub count: i32,
}

// Inventory status for charts
#[derive(Serialize, Debug, FromRow)]
pub struct InventoryStatus {
    pub status: String, // "low", "normal", "out_of_stock"
    pub count: i32,
}

// KPI configuration for user preferences
#[derive(Serialize, Deserialize, Debug)]
pub struct KpiConfig {
    pub show_total_products: bool,
    pub show_today_sales: bool,
    pub show_low_stock: bool,
    pub show_active_categories: bool,
    pub show_total_revenue: bool,
    pub show_sales_count: bool,
}

// Complete dashboard response
#[derive(Serialize, Debug)]
pub struct DashboardResponse {
    pub stats: DashboardStats,
    pub sales_trend: Vec<SalesTrend>,
    pub inventory_status: Vec<InventoryStatus>,
    pub kpi_config: KpiConfig,
}