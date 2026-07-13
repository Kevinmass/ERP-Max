use sqlx::SqlitePool;
use crate::modules::dashboard::models::{DashboardStats, SalesTrend, InventoryStatus, DashboardResponse, KpiConfig, TopProduct, CategoryRevenue};
use crate::modules::settings::service::get_setting;

pub async fn get_dashboard_stats(pool: &SqlitePool) -> Result<DashboardStats, sqlx::Error> {
    let today = chrono::Utc::now().date_naive();
    let today_str = today.format("%Y-%m-%d").to_string();
    
    let stats = sqlx::query_as::<_, DashboardStats>(r#"
        SELECT
            (SELECT COUNT(*) FROM productos WHERE archivado = 0) as total_products,
            COALESCE((SELECT SUM(total) FROM ventas WHERE DATE(fecha) = ? AND archivado = 0), 0.0) as today_sales,
            (SELECT COUNT(*) FROM productos p
             LEFT JOIN inventory i ON p.id = i.product_id
             WHERE p.archivado = 0 AND (i.quantity IS NULL OR i.quantity <= i.min_stock_level)) as low_stock_items,
            (SELECT COUNT(*) FROM categorias WHERE archivado = 0) as active_categories,
            COALESCE((SELECT SUM(total) FROM ventas WHERE archivado = 0), 0.0) as total_revenue,
            (SELECT COUNT(*) FROM ventas WHERE archivado = 0) as sales_count,
            (SELECT COUNT(*) FROM ventas WHERE DATE(fecha) = ? AND archivado = 0) as today_sales_count,
            COALESCE((
                SELECT SUM(vi.cantidad) FROM venta_items vi
                JOIN ventas v ON vi.venta_id = v.id
                WHERE DATE(v.fecha) = ? AND v.archivado = 0
            ), 0) as today_items_sold
    "#)
    .bind(&today_str)
    .bind(&today_str)
    .bind(&today_str)
    .fetch_one(pool)
    .await?;
    
    Ok(stats)
}

pub async fn get_sales_trend(pool: &SqlitePool, days: i32) -> Result<Vec<SalesTrend>, sqlx::Error> {
    let start_date = chrono::Utc::now().date_naive() - chrono::Duration::days(days as i64);
    let start_date_str = start_date.format("%Y-%m-%d").to_string();
    
    let trends = sqlx::query_as::<_, SalesTrend>(r#"
        SELECT DATE(fecha) as date, 
               COALESCE(SUM(total), 0) as total, 
               COUNT(*) as count
        FROM ventas 
        WHERE DATE(fecha) >= ? AND archivado = 0
        GROUP BY DATE(fecha)
        ORDER BY date DESC
        LIMIT ?
    "#)
    .bind(start_date_str)
    .bind(days)
    .fetch_all(pool)
    .await?;
    
    Ok(trends)
}

pub async fn get_inventory_status(pool: &SqlitePool) -> Result<Vec<InventoryStatus>, sqlx::Error> {
    let status = sqlx::query_as::<_, InventoryStatus>(r#"
        SELECT 
            CASE 
                WHEN i.quantity IS NULL OR i.quantity = 0 THEN 'out_of_stock'
                WHEN i.quantity <= i.min_stock_level THEN 'low'
                ELSE 'normal'
            END as status,
            COUNT(*) as count
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.archivado = 0
        GROUP BY status
    "#)
    .fetch_all(pool)
    .await?;
    
    Ok(status)
}

pub async fn get_top_selling_products(pool: &SqlitePool, limit: i32) -> Result<Vec<TopProduct>, sqlx::Error> {
    let products = sqlx::query_as::<_, TopProduct>(r#"
        SELECT
            p.id as producto_id,
            p.nombre as nombre,
            SUM(vi.cantidad) as cantidad_vendida,
            SUM(vi.cantidad * COALESCE(vi.precio_unitario, p.costo)) as ingresos
        FROM venta_items vi
        JOIN ventas v ON vi.venta_id = v.id
        JOIN productos p ON vi.producto_id = p.id
        WHERE v.archivado = 0
        GROUP BY p.id, p.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT ?
    "#)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(products)
}

pub async fn get_revenue_by_category(pool: &SqlitePool) -> Result<Vec<CategoryRevenue>, sqlx::Error> {
    let revenue = sqlx::query_as::<_, CategoryRevenue>(r#"
        SELECT
            COALESCE(c.nombre, 'Sin categoría') as categoria,
            SUM(vi.cantidad * COALESCE(vi.precio_unitario, p.costo)) as ingresos
        FROM venta_items vi
        JOIN ventas v ON vi.venta_id = v.id
        JOIN productos p ON vi.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE v.archivado = 0
        GROUP BY categoria
        ORDER BY ingresos DESC
        LIMIT 8
    "#)
    .fetch_all(pool)
    .await?;

    Ok(revenue)
}

pub async fn get_kpi_config(pool: &SqlitePool) -> Result<KpiConfig, sqlx::Error> {
    // Get user preferences from settings, with defaults if not set
    let show_total_products = get_setting(pool, "dashboard.show_total_products").await.unwrap_or_else(|_| "true".to_string()) == "true";
    let show_today_sales = get_setting(pool, "dashboard.show_today_sales").await.unwrap_or_else(|_| "true".to_string()) == "true";
    let show_low_stock = get_setting(pool, "dashboard.show_low_stock").await.unwrap_or_else(|_| "true".to_string()) == "true";
    let show_active_categories = get_setting(pool, "dashboard.show_active_categories").await.unwrap_or_else(|_| "true".to_string()) == "true";
    let show_total_revenue = get_setting(pool, "dashboard.show_total_revenue").await.unwrap_or_else(|_| "false".to_string()) == "true";
    let show_sales_count = get_setting(pool, "dashboard.show_sales_count").await.unwrap_or_else(|_| "false".to_string()) == "true";
    
    Ok(KpiConfig {
        show_total_products,
        show_today_sales,
        show_low_stock,
        show_active_categories,
        show_total_revenue,
        show_sales_count,
    })
}

pub async fn get_dashboard_data(pool: &SqlitePool) -> Result<DashboardResponse, sqlx::Error> {
    let stats = get_dashboard_stats(pool).await?;
    let sales_trend = get_sales_trend(pool, 7).await?;
    let inventory_status = get_inventory_status(pool).await?;
    let kpi_config = get_kpi_config(pool).await?;
    
    Ok(DashboardResponse {
        stats,
        sales_trend,
        inventory_status,
        kpi_config,
    })
}