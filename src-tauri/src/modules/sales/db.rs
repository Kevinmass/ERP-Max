use sqlx::{SqlitePool, Row};
use crate::modules::sales::models::{Venta, VentaItem, CrearVenta, VentaResponse};
use crate::modules::stock::models::AdjustStockRequest;
use crate::modules::stock::db::adjust_stock_tx;

pub async fn process_sale(
    pool: &SqlitePool,
    sale_data: CrearVenta,
) -> Result<VentaResponse, String> {
    // Start a transaction
    let mut tx = pool.begin().await.map_err(|e| format!("Error starting transaction: {}", e))?;

    // Calculate total by getting product prices and applying modifications
    let mut total = 0.0;
    for item in &sale_data.items {
        let base_price: f64 = sqlx::query_scalar(
            "SELECT costo FROM productos WHERE id = ?"
        )
        .bind(item.producto_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Error getting product price for id {}: {}", item.producto_id, e))?;

        // Use modified price if provided, otherwise use base price
        let final_price = item.precio_modificado.unwrap_or(base_price);
        total += final_price * item.cantidad as f64;
    }

    // Insert sale
    let sale_id = sqlx::query(
        r#"
        INSERT INTO ventas (fecha, estado, total, observaciones, cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono)
        VALUES (datetime('now'), 'completa', ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(total)
    .bind(&sale_data.observaciones)
    .bind(&sale_data.cliente_nombre)
    .bind(&sale_data.cliente_domicilio)
    .bind(&sale_data.cliente_localidad)
    .bind(&sale_data.cliente_telefono)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Error inserting sale: {}", e))?
    .last_insert_rowid() as i32;

    // Insert sale items
    let mut items = Vec::new();
    for item_data in &sale_data.items {
        let item_id = sqlx::query(
            r#"
            INSERT INTO venta_items (venta_id, producto_id, cantidad, entregado, estado)
            VALUES (?, ?, ?, 0, 'pendiente')
            "#
        )
        .bind(sale_id)
        .bind(item_data.producto_id)
        .bind(item_data.cantidad)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error inserting sale item: {}", e))?
        .last_insert_rowid() as i32;

        items.push(VentaItem {
            id: item_id,
            venta_id: sale_id,
            producto_id: item_data.producto_id,
            cantidad: item_data.cantidad,
            entregado: 0,
            fecha_entrega: None,
            estado: "pendiente".to_string(),
            producto_nombre: None,
            costo: None,
            subtotal: None,
        });
    }

    // Decrement inventory for each item
    for item_data in &sale_data.items {
        let _ = adjust_stock_tx(&mut tx, AdjustStockRequest {
            product_id: item_data.producto_id,
            delta: -(item_data.cantidad as i32),
        }).await?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| format!("Error committing transaction: {}", e))?;

    // Return response
    let venta = Venta {
        id: sale_id,
        fecha: chrono::Utc::now().to_rfc3339(),
        estado: "completa".to_string(),
        total,
        observaciones: sale_data.observaciones,
        cliente_nombre: sale_data.cliente_nombre,
        cliente_domicilio: sale_data.cliente_domicilio,
        cliente_localidad: sale_data.cliente_localidad,
        cliente_telefono: sale_data.cliente_telefono,
        archivado: false,
    };

    Ok(VentaResponse { venta, items })
}

pub async fn get_sales_history(
    pool: &SqlitePool,
    limit: i32,
    offset: i32,
) -> Result<Vec<VentaResponse>, String> {
    // Get sales
    let rows = sqlx::query(
        r#"
        SELECT id, fecha, estado, total, observaciones,
               cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono
        FROM ventas
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching sales: {}", e))?;

    let mut sales = Vec::new();
    for row in rows {
        sales.push(Venta {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            fecha: row.try_get("fecha").map_err(|e| format!("Error getting fecha: {}", e))?,
            estado: row.try_get("estado").map_err(|e| format!("Error getting estado: {}", e))?,
            total: row.try_get("total").map_err(|e| format!("Error getting total: {}", e))?,
            observaciones: row.try_get("observaciones").map_err(|e| format!("Error getting observaciones: {}", e))?,
            cliente_nombre: row.try_get("cliente_nombre").map_err(|e| format!("Error getting cliente_nombre: {}", e))?,
            cliente_domicilio: row.try_get("cliente_domicilio").map_err(|e| format!("Error getting cliente_domicilio: {}", e))?,
            cliente_localidad: row.try_get("cliente_localidad").map_err(|e| format!("Error getting cliente_localidad: {}", e))?,
            cliente_telefono: row.try_get("cliente_telefono").map_err(|e| format!("Error getting cliente_telefono: {}", e))?,
            archivado: row.try_get("archivado").map_err(|e| format!("Error getting archivado: {}", e))?,
        });
    }

    // For each sale, get items with product information
    let mut sales_with_items = Vec::new();
    for venta in sales {
        let item_rows = sqlx::query(
            r#"
            SELECT vi.id, vi.venta_id, vi.producto_id, vi.cantidad, vi.entregado,
                   vi.fecha_entrega, vi.estado, p.nombre as producto_nombre, p.costo
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            WHERE vi.venta_id = ?
            "#,
        )
        .bind(venta.id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching items for sale {}: {}", venta.id, e))?;

        let mut items = Vec::new();
        for row in item_rows {
            let costo: f64 = row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?;
            let cantidad: i32 = row.try_get("cantidad").map_err(|e| format!("Error getting cantidad: {}", e))?;
            let subtotal = costo * cantidad as f64;
            
            items.push(VentaItem {
                id: row.try_get("id").map_err(|e| format!("Error getting item id: {}", e))?,
                venta_id: row.try_get("venta_id").map_err(|e| format!("Error getting venta_id: {}", e))?,
                producto_id: row.try_get("producto_id").map_err(|e| format!("Error getting producto_id: {}", e))?,
                cantidad,
                entregado: row.try_get("entregado").map_err(|e| format!("Error getting entregado: {}", e))?,
                fecha_entrega: row.try_get("fecha_entrega").map_err(|e| format!("Error getting fecha_entrega: {}", e))?,
                estado: row.try_get("estado").map_err(|e| format!("Error getting item estado: {}", e))?,
                producto_nombre: row.try_get("producto_nombre").map_err(|e| format!("Error getting producto_nombre: {}", e))?,
                costo: Some(costo),
                subtotal: Some(subtotal),
            });
        }

        sales_with_items.push(VentaResponse { venta, items });
    }

    Ok(sales_with_items)
}

pub async fn get_archived_sales(
    pool: &SqlitePool,
    limit: i32,
    offset: i32,
) -> Result<Vec<VentaResponse>, String> {
    // Get archived sales
    let rows = sqlx::query(
        r#"
        SELECT id, fecha, estado, total, observaciones,
               cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono, archivado
        FROM ventas
        WHERE archivado = 1
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching archived sales: {}", e))?;

    let mut sales = Vec::new();
    for row in rows {
        sales.push(Venta {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            fecha: row.try_get("fecha").map_err(|e| format!("Error getting fecha: {}", e))?,
            estado: row.try_get("estado").map_err(|e| format!("Error getting estado: {}", e))?,
            total: row.try_get("total").map_err(|e| format!("Error getting total: {}", e))?,
            observaciones: row.try_get("observaciones").map_err(|e| format!("Error getting observaciones: {}", e))?,
            cliente_nombre: row.try_get("cliente_nombre").map_err(|e| format!("Error getting cliente_nombre: {}", e))?,
            cliente_domicilio: row.try_get("cliente_domicilio").map_err(|e| format!("Error getting cliente_domicilio: {}", e))?,
            cliente_localidad: row.try_get("cliente_localidad").map_err(|e| format!("Error getting cliente_localidad: {}", e))?,
            cliente_telefono: row.try_get("cliente_telefono").map_err(|e| format!("Error getting cliente_telefono: {}", e))?,
            archivado: row.try_get("archivado").map_err(|e| format!("Error getting archivado: {}", e))?,
        });
    }

    // For each sale, get items with product information
    let mut sales_with_items = Vec::new();
    for venta in sales {
        let item_rows = sqlx::query(
            r#"
            SELECT vi.id, vi.venta_id, vi.producto_id, vi.cantidad, vi.entregado,
                   vi.fecha_entrega, vi.estado, p.nombre as producto_nombre, p.costo
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            WHERE vi.venta_id = ?
            "#,
        )
        .bind(venta.id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching items for sale {}: {}", venta.id, e))?;

        let mut items = Vec::new();
        for row in item_rows {
            let costo: f64 = row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?;
            let cantidad: i32 = row.try_get("cantidad").map_err(|e| format!("Error getting cantidad: {}", e))?;
            let subtotal = costo * cantidad as f64;
            
            items.push(VentaItem {
                id: row.try_get("id").map_err(|e| format!("Error getting item id: {}", e))?,
                venta_id: row.try_get("venta_id").map_err(|e| format!("Error getting venta_id: {}", e))?,
                producto_id: row.try_get("producto_id").map_err(|e| format!("Error getting producto_id: {}", e))?,
                cantidad,
                entregado: row.try_get("entregado").map_err(|e| format!("Error getting entregado: {}", e))?,
                fecha_entrega: row.try_get("fecha_entrega").map_err(|e| format!("Error getting fecha_entrega: {}", e))?,
                estado: row.try_get("estado").map_err(|e| format!("Error getting item estado: {}", e))?,
                producto_nombre: row.try_get("producto_nombre").map_err(|e| format!("Error getting producto_nombre: {}", e))?,
                costo: Some(costo),
                subtotal: Some(subtotal),
            });
        }

        sales_with_items.push(VentaResponse { venta, items });
    }

    Ok(sales_with_items)
}

pub async fn get_sales_history_with_filter(
    pool: &SqlitePool,
    limit: i32,
    offset: i32,
    only_active: bool,
) -> Result<Vec<VentaResponse>, String> {
    // let archived_filter = if only_active { 0 } else { -1 }; // -1 means no filter
    
    let query = if only_active {
        r#"
        SELECT id, fecha, estado, total, observaciones,
               cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono, archivado
        FROM ventas
        WHERE archivado = 0
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?
        "#
    } else {
        r#"
        SELECT id, fecha, estado, total, observaciones,
               cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono, archivado
        FROM ventas
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?
        "#
    };

    let rows = sqlx::query(query)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching sales: {}", e))?;

    let mut sales = Vec::new();
    for row in rows {
        sales.push(Venta {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            fecha: row.try_get("fecha").map_err(|e| format!("Error getting fecha: {}", e))?,
            estado: row.try_get("estado").map_err(|e| format!("Error getting estado: {}", e))?,
            total: row.try_get("total").map_err(|e| format!("Error getting total: {}", e))?,
            observaciones: row.try_get("observaciones").map_err(|e| format!("Error getting observaciones: {}", e))?,
            cliente_nombre: row.try_get("cliente_nombre").map_err(|e| format!("Error getting cliente_nombre: {}", e))?,
            cliente_domicilio: row.try_get("cliente_domicilio").map_err(|e| format!("Error getting cliente_domicilio: {}", e))?,
            cliente_localidad: row.try_get("cliente_localidad").map_err(|e| format!("Error getting cliente_localidad: {}", e))?,
            cliente_telefono: row.try_get("cliente_telefono").map_err(|e| format!("Error getting cliente_telefono: {}", e))?,
            archivado: row.try_get("archivado").map_err(|e| format!("Error getting archivado: {}", e))?,
        });
    }

    // For each sale, get items with product information
    let mut sales_with_items = Vec::new();
    for venta in sales {
        let item_rows = sqlx::query(
            r#"
            SELECT vi.id, vi.venta_id, vi.producto_id, vi.cantidad, vi.entregado,
                   vi.fecha_entrega, vi.estado, p.nombre as producto_nombre, p.costo
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            WHERE vi.venta_id = ?
            "#,
        )
        .bind(venta.id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching items for sale {}: {}", venta.id, e))?;

        let mut items = Vec::new();
        for row in item_rows {
            let costo: f64 = row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?;
            let cantidad: i32 = row.try_get("cantidad").map_err(|e| format!("Error getting cantidad: {}", e))?;
            let subtotal = costo * cantidad as f64;
            
            items.push(VentaItem {
                id: row.try_get("id").map_err(|e| format!("Error getting item id: {}", e))?,
                venta_id: row.try_get("venta_id").map_err(|e| format!("Error getting venta_id: {}", e))?,
                producto_id: row.try_get("producto_id").map_err(|e| format!("Error getting producto_id: {}", e))?,
                cantidad,
                entregado: row.try_get("entregado").map_err(|e| format!("Error getting entregado: {}", e))?,
                fecha_entrega: row.try_get("fecha_entrega").map_err(|e| format!("Error getting fecha_entrega: {}", e))?,
                estado: row.try_get("estado").map_err(|e| format!("Error getting item estado: {}", e))?,
                producto_nombre: row.try_get("producto_nombre").map_err(|e| format!("Error getting producto_nombre: {}", e))?,
                costo: Some(costo),
                subtotal: Some(subtotal),
            });
        }

        sales_with_items.push(VentaResponse { venta, items });
    }

    Ok(sales_with_items)
}