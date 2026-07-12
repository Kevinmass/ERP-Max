use sqlx::{SqlitePool, Row};
use crate::modules::catalogue::models::{Producto, ProductoResponse, Categoria, CrearProducto, ActualizarProducto, CrearCategoria};
use serde::Serialize;

/// Producto para exportación (sin fotos para mantener el archivo ligero)
#[derive(Serialize, Debug, Clone)]
pub struct ProductoExport {
    pub id: i32,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub costo: f64,
    pub stock: i32,
    pub categoria_nombre: Option<String>,
    pub tags: Option<String>,
}

/// Resultado de reimportar precios desde Excel
#[derive(Serialize, Debug)]
pub struct ReimportarPreciosResult {
    pub total_procesados: i32,
    pub actualizados: i32,
    pub errores: Vec<String>,
}

/// Get all products grouped by category hierarchy for PDF export
pub async fn get_products_grouped_by_category(
    pool: &SqlitePool,
) -> Result<Vec<crate::modules::catalogue::models::CategoryWithProducts>, String> {
    // First, get all categories with their hierarchy levels
    let categories_query = r#"
        WITH RECURSIVE category_hierarchy AS (
            SELECT id, nombre, descripcion, categoria_padre_id, 0 as level
            FROM categorias WHERE categoria_padre_id IS NULL
            UNION ALL
            SELECT c.id, c.nombre, c.descripcion, c.categoria_padre_id, ch.level + 1
            FROM categorias c
            JOIN category_hierarchy ch ON c.categoria_padre_id = ch.id
        )
        SELECT id, nombre, descripcion, categoria_padre_id, level
        FROM category_hierarchy
        ORDER BY level, nombre
    "#;

    let category_rows = sqlx::query(categories_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching categories: {}", e))?;

    let mut categories_with_products = Vec::new();

    for category_row in category_rows {
        let category_id: i32 = category_row.try_get("id").map_err(|e| format!("Error getting category id: {}", e))?;
        let category_level: i32 = category_row.try_get("level").map_err(|e| format!("Error getting category level: {}", e))?;

        // Get products for this category
        let products_query = r#"
            SELECT p.id, p.nombre, p.descripcion, p.costo, 
                   COALESCE(i.quantity, 0) as stock, 
                   COALESCE(c.nombre, '') as categoria_nombre,
                   COALESCE(p.tags, '') as tags
            FROM productos p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.categoria_id = ?
            ORDER BY p.nombre
        "#;

        let product_rows = sqlx::query(products_query)
            .bind(category_id)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Error fetching products for category: {}", e))?;

        let mut productos = Vec::new();
        for product_row in product_rows {
            let categoria_nombre: String = product_row.try_get("categoria_nombre").map_err(|e| format!("Error getting categoria: {}", e))?;
            let tags: String = product_row.try_get("tags").map_err(|e| format!("Error getting tags: {}", e))?;
            
            productos.push(crate::modules::catalogue::models::ProductoExport {
                id: product_row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
                nombre: product_row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
                descripcion: product_row.try_get("descripcion").ok(),
                costo: product_row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
                stock: product_row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
                categoria_nombre: if categoria_nombre.is_empty() { None } else { Some(categoria_nombre) },
                tags: if tags.is_empty() { None } else { Some(tags) },
            });
        }

        categories_with_products.push(crate::modules::catalogue::models::CategoryWithProducts {
            id: category_id,
            nombre: category_row.try_get("nombre").map_err(|e| format!("Error getting category nombre: {}", e))?,
            descripcion: category_row.try_get("descripcion").ok(),
            categoria_padre_id: category_row.try_get("categoria_padre_id").ok(),
            level: category_level,
            productos,
        });
    }

    Ok(categories_with_products)
}

pub async fn get_all_products_filtered(
    pool: &SqlitePool,
    page: Option<i32>,
    page_size: Option<i32>,
    search_query: Option<String>,
    categoria_id: Option<i32>,
    include_fotos: Option<bool>,
) -> Result<ProductoResponse, String> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    // Photos (base64) are heavy; table view fetches without them so it can load
    // the whole filtered set cheaply. The subquery is a constant string here — no
    // user input — so building it into the query is safe.
    let fotos_select = if include_fotos.unwrap_or(true) {
        "(SELECT GROUP_CONCAT(pf.contenido_base64, '|||') FROM (
               SELECT contenido_base64 FROM producto_fotos
               WHERE producto_id = p.id ORDER BY orden LIMIT 3
           ) pf) as fotos"
    } else {
        "NULL as fotos"
    };

    // Build dynamic query for filtering
    let mut query_builder = sqlx::QueryBuilder::new(format!(
        "SELECT p.id, p.nombre, p.descripcion, p.costo, p.precio_compra,
               COALESCE(i.quantity, 0) as stock, p.categoria_id, p.tags,
               {}
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE 1=1",
        fotos_select
    ));

    // Add search filter
    if let Some(search) = &search_query {
        if !search.trim().is_empty() {
            query_builder.push(" AND (");
            query_builder.push("LOWER(p.nombre) LIKE ");
            query_builder.push_bind(format!("%{}%", search.to_lowercase()));
            query_builder.push(" OR LOWER(COALESCE(p.descripcion, '')) LIKE ");
            query_builder.push_bind(format!("%{}%", search.to_lowercase()));
            query_builder.push(" OR LOWER(COALESCE(p.tags, '')) LIKE ");
            query_builder.push_bind(format!("%{}%", search.to_lowercase()));
            query_builder.push(")");
        }
    }

    // Add category filter with hierarchy support
    if let Some(cat_id) = categoria_id {
        // Get all category IDs in the hierarchy
        let category_ids = get_category_hierarchy_ids(pool, cat_id).await?;
        
        if !category_ids.is_empty() {
            query_builder.push(" AND p.categoria_id IN (");
            for (i, id) in category_ids.iter().enumerate() {
                if i > 0 {
                    query_builder.push(", ");
                }
                query_builder.push_bind(*id);
            }
            query_builder.push(")");
        }
    }

    query_builder.push(" ORDER BY p.id DESC LIMIT ");
    query_builder.push_bind(page_size);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    // Get total count with same filters
    let mut count_builder = sqlx::QueryBuilder::new("SELECT COUNT(*) FROM productos p LEFT JOIN inventory i ON p.id = i.product_id WHERE 1=1");
    
    if let Some(search) = &search_query {
        if !search.trim().is_empty() {
            count_builder.push(" AND (");
            count_builder.push("LOWER(p.nombre) LIKE ");
            count_builder.push_bind(format!("%{}%", search.to_lowercase()));
            count_builder.push(" OR LOWER(COALESCE(p.descripcion, '')) LIKE ");
            count_builder.push_bind(format!("%{}%", search.to_lowercase()));
            count_builder.push(" OR LOWER(COALESCE(p.tags, '')) LIKE ");
            count_builder.push_bind(format!("%{}%", search.to_lowercase()));
            count_builder.push(")");
        }
    }

    if let Some(cat_id) = categoria_id {
        let category_ids = get_category_hierarchy_ids(pool, cat_id).await?;
        
        if !category_ids.is_empty() {
            count_builder.push(" AND p.categoria_id IN (");
            for (i, id) in category_ids.iter().enumerate() {
                if i > 0 {
                    count_builder.push(", ");
                }
                count_builder.push_bind(*id);
            }
            count_builder.push(")");
        }
    }

    let total: i32 = count_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting total count: {}", e))?;

    // Execute main query
    let rows = query_builder.build().fetch_all(pool).await
        .map_err(|e| format!("Error fetching products: {}", e))?;

    let mut data = Vec::new();
    for row in rows {
        let fotos_str: Option<String> = row.try_get("fotos").unwrap_or(None);
        let fotos = fotos_str
            .map(|s| s.split("|||").filter(|s| !s.is_empty()).map(String::from).collect())
            .unwrap_or_else(Vec::new);

        data.push(Producto {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
            descripcion: row.try_get("descripcion").ok(),
            costo: row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
            precio_compra: row.try_get("precio_compra").ok(),
            stock: row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
            categoria_id: row.try_get("categoria_id").ok(),
            tags: row.try_get("tags").ok(),
            fotos,
        });
    }

    // Calculate low stock and out of stock using inventory data with same filters
    let mut low_stock_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM productos p LEFT JOIN inventory i ON p.id = i.product_id WHERE 1=1 AND COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= 5"
    );
    
    if let Some(search) = &search_query {
        if !search.trim().is_empty() {
            low_stock_builder.push(" AND (");
            low_stock_builder.push("LOWER(p.nombre) LIKE ");
            low_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            low_stock_builder.push(" OR LOWER(COALESCE(p.descripcion, '')) LIKE ");
            low_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            low_stock_builder.push(" OR LOWER(COALESCE(p.tags, '')) LIKE ");
            low_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            low_stock_builder.push(")");
        }
    }

    if let Some(cat_id) = categoria_id {
        let category_ids = get_category_hierarchy_ids(pool, cat_id).await?;
        
        if !category_ids.is_empty() {
            low_stock_builder.push(" AND p.categoria_id IN (");
            for (i, id) in category_ids.iter().enumerate() {
                if i > 0 {
                    low_stock_builder.push(", ");
                }
                low_stock_builder.push_bind(*id);
            }
            low_stock_builder.push(")");
        }
    }

    let low_stock: i32 = low_stock_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting low stock count: {}", e))?;

    let mut out_of_stock_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM productos p LEFT JOIN inventory i ON p.id = i.product_id WHERE 1=1 AND COALESCE(i.quantity, 0) = 0"
    );
    
    if let Some(search) = &search_query {
        if !search.trim().is_empty() {
            out_of_stock_builder.push(" AND (");
            out_of_stock_builder.push("LOWER(p.nombre) LIKE ");
            out_of_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            out_of_stock_builder.push(" OR LOWER(COALESCE(p.descripcion, '')) LIKE ");
            out_of_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            out_of_stock_builder.push(" OR LOWER(COALESCE(p.tags, '')) LIKE ");
            out_of_stock_builder.push_bind(format!("%{}%", search.to_lowercase()));
            out_of_stock_builder.push(")");
        }
    }

    if let Some(cat_id) = categoria_id {
        let category_ids = get_category_hierarchy_ids(pool, cat_id).await?;
        
        if !category_ids.is_empty() {
            out_of_stock_builder.push(" AND p.categoria_id IN (");
            for (i, id) in category_ids.iter().enumerate() {
                if i > 0 {
                    out_of_stock_builder.push(", ");
                }
                out_of_stock_builder.push_bind(*id);
            }
            out_of_stock_builder.push(")");
        }
    }

    let out_of_stock: i32 = out_of_stock_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting out of stock count: {}", e))?;

    Ok(ProductoResponse {
        data,
        total,
        low_stock,
        out_of_stock,
    })
}

/// Get all products for export (without pagination, without photos)
pub async fn get_all_products_for_export(
    pool: &SqlitePool,
) -> Result<Vec<ProductoExport>, String> {
    let rows = sqlx::query(
        r#"
        SELECT p.id, p.nombre, p.descripcion, p.costo, 
               COALESCE(i.quantity, 0) as stock, 
               COALESCE(c.nombre, '') as categoria_nombre,
               COALESCE(p.tags, '') as tags
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.nombre
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching products for export: {}", e))?;

    let mut products = Vec::new();
    for row in rows {
        let categoria_nombre: String = row.try_get("categoria_nombre").map_err(|e| format!("Error getting categoria: {}", e))?;
        let tags: String = row.try_get("tags").map_err(|e| format!("Error getting tags: {}", e))?;
        
        products.push(ProductoExport {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
            descripcion: row.try_get("descripcion").ok(),
            costo: row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
            stock: row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
            categoria_nombre: if categoria_nombre.is_empty() { None } else { Some(categoria_nombre) },
            tags: if tags.is_empty() { None } else { Some(tags) },
        });
    }

    Ok(products)
}

/// Update product prices by ID
pub async fn update_product_price_by_id(
    pool: &SqlitePool,
    product_id: i32,
    new_price: f64,
) -> Result<(), String> {
    sqlx::query("UPDATE productos SET costo = ? WHERE id = ?")
        .bind(new_price)
        .bind(product_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error updating price: {}", e))?;
    
    Ok(())
}

/// Apply a bulk percentage adjustment to the selling price of the given products.
///
/// For each product: if it has no recorded cost yet, the current price is captured
/// as its cost (once); then the selling price is raised by `porcentaje` percent and
/// rounded to the nearest whole peso. Runs in a single transaction — all or nothing.
pub async fn aplicar_ajuste_precios(
    pool: &SqlitePool,
    product_ids: &[i32],
    porcentaje: f64,
    desde_costo: bool,
) -> Result<i32, String> {
    if product_ids.is_empty() {
        return Ok(0);
    }

    let factor = 1.0 + porcentaje / 100.0;
    let mut tx = pool.begin().await.map_err(|e| format!("Error starting transaction: {}", e))?;
    let mut actualizados = 0;

    for &id in product_ids {
        let row = sqlx::query("SELECT costo, precio_compra FROM productos WHERE id = ?")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| format!("Error reading product {}: {}", id, e))?;

        let row = match row {
            Some(r) => r,
            None => continue, // skip ids that no longer exist
        };

        let costo: f64 = row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?;
        let precio_compra: Option<f64> = row.try_get("precio_compra").ok();

        let (nuevo_costo, nuevo_precio_compra) = if desde_costo {
            // "From cost": set selling price = cost × (1 + %). Needs a recorded
            // cost — skip products that don't have one. Cost stays unchanged.
            match precio_compra {
                Some(c) => ((c * factor).round(), c),
                None => continue,
            }
        } else {
            // "From current price": raise selling price, capturing the cost basis
            // once (from the current price) if it isn't set yet.
            ((costo * factor).round(), precio_compra.unwrap_or(costo))
        };

        sqlx::query("UPDATE productos SET costo = ?, precio_compra = ? WHERE id = ?")
            .bind(nuevo_costo)
            .bind(nuevo_precio_compra)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Error updating product {}: {}", id, e))?;

        actualizados += 1;
    }

    tx.commit().await.map_err(|e| format!("Error committing transaction: {}", e))?;
    Ok(actualizados)
}

/// Get product by name (for import matching)
#[allow(dead_code)]
pub async fn get_product_by_name(
    pool: &SqlitePool,
    nombre: &str,
) -> Result<Option<Producto>, String> {
    let row = sqlx::query(
        r#"
        SELECT p.id, p.nombre, p.descripcion, p.costo, 
               COALESCE(i.quantity, 0) as stock, p.categoria_id, p.tags
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE LOWER(p.nombre) = LOWER(?)
        "#
    )
    .bind(nombre)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error fetching product by name: {}", e))?;

    match row {
        Some(row) => Ok(Some(Producto {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
            descripcion: row.try_get("descripcion").ok(),
            costo: row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
            precio_compra: row.try_get("precio_compra").ok(),
            stock: row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
            categoria_id: row.try_get("categoria_id").ok(),
            tags: row.try_get("tags").ok(),
            fotos: vec![],
        })),
        None => Ok(None),
    }
}

#[allow(dead_code)]
pub async fn get_all_products(
    pool: &SqlitePool,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<ProductoResponse, String> {
    get_all_products_filtered(pool, page, page_size, None, None, None).await
}

pub async fn create_product(
    pool: &SqlitePool,
    producto: CrearProducto,
) -> Result<Producto, String> {
    // Insert product
    let product_id: i32 = sqlx::query_scalar(
        "INSERT INTO productos (nombre, descripcion, costo, precio_compra, stock, categoria_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
    )
    .bind(&producto.nombre)
    .bind(&producto.descripcion)
    .bind(producto.costo)
    .bind(producto.precio_compra)
    .bind(producto.stock.unwrap_or(0))
    .bind(producto.categoria_id)
    .bind(&producto.tags)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error creating product: {}", e))?;

    // Insert photos if any
    if !producto.fotos.is_empty() {
        for (index, foto) in producto.fotos.iter().enumerate() {
            sqlx::query(
                "INSERT INTO producto_fotos (producto_id, contenido_base64, orden) VALUES (?, ?, ?)"
            )
            .bind(product_id)
            .bind(foto)
            .bind(index as i32)
            .execute(pool)
            .await
            .map_err(|e| format!("Error inserting photo: {}", e))?;
        }
    }

    // Sync initial stock with inventory table
    let initial_stock = producto.stock.unwrap_or(0);
    if initial_stock > 0 {
        // Use the adjust_stock function from stock module
        use crate::modules::stock::models::AdjustStockRequest;
        use crate::modules::stock::db::adjust_stock;
        
        let request = AdjustStockRequest {
            product_id,
            delta: initial_stock,
        };
        adjust_stock(pool, request).await?;
    }

    // Return the created product
    Ok(Producto {
        id: product_id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        costo: producto.costo,
        precio_compra: producto.precio_compra,
        stock: initial_stock,
        categoria_id: producto.categoria_id,
        tags: producto.tags,
        fotos: producto.fotos,
    })
}

pub async fn update_product(
    pool: &SqlitePool,
    producto: ActualizarProducto,
) -> Result<Producto, String> {
    // Validate the product exists (clear error instead of a silent no-op update).
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM productos WHERE id = ?")
        .bind(producto.id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error checking product: {}", e))?;
    if exists == 0 {
        return Err(format!("Product with ID {} not found", producto.id));
    }

    // Update product
    sqlx::query(
        "UPDATE productos SET nombre = ?, descripcion = ?, costo = ?, precio_compra = ?, stock = ?, categoria_id = ?, tags = ? WHERE id = ?"
    )
    .bind(&producto.nombre)
    .bind(&producto.descripcion)
    .bind(producto.costo)
    .bind(producto.precio_compra)
    .bind(producto.stock)
    .bind(producto.categoria_id)
    .bind(&producto.tags)
    .bind(producto.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error updating product: {}", e))?;

    // Delete existing photos
    sqlx::query("DELETE FROM producto_fotos WHERE producto_id = ?")
        .bind(producto.id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting old photos: {}", e))?;

    // Insert new photos
    if !producto.fotos.is_empty() {
        for (index, foto) in producto.fotos.iter().enumerate() {
            sqlx::query(
                "INSERT INTO producto_fotos (producto_id, contenido_base64, orden) VALUES (?, ?, ?)"
            )
            .bind(producto.id)
            .bind(foto)
            .bind(index as i32)
            .execute(pool)
            .await
            .map_err(|e| format!("Error inserting photo: {}", e))?;
        }
    }

    // Inventory is the single source of truth for stock. A product edit sets the
    // inventory quantity absolutely to the edited value — never a delta against
    // productos.stock (that column is no longer read and would drift after sales).
    use crate::modules::stock::models::UpdateStockRequest;
    use crate::modules::stock::db::update_stock_manually;
    update_stock_manually(pool, UpdateStockRequest {
        product_id: producto.id,
        quantity: producto.stock,
    }).await?;

    // Return the updated product
    Ok(Producto {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        costo: producto.costo,
        precio_compra: producto.precio_compra,
        stock: producto.stock,
        categoria_id: producto.categoria_id,
        tags: producto.tags,
        fotos: producto.fotos,
    })
}

pub async fn delete_product(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<(), String> {
    sqlx::query("DELETE FROM productos WHERE id = ?")
        .bind(product_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting product: {}", e))?;

    Ok(())
}

pub async fn get_categories(
    pool: &SqlitePool,
) -> Result<Vec<Categoria>, String> {
    let rows = sqlx::query("SELECT id, nombre, descripcion, categoria_padre_id FROM categorias ORDER BY nombre")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching categories: {}", e))?;

    let mut categories = Vec::new();
    for row in rows {
        categories.push(Categoria {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
            descripcion: row.try_get("descripcion").ok(),
            categoria_padre_id: row.try_get("categoria_padre_id").ok(),
        });
    }

    Ok(categories)
}

pub async fn create_category(
    pool: &SqlitePool,
    categoria: CrearCategoria,
) -> Result<Categoria, String> {
    let category_id: i32 = sqlx::query_scalar(
        "INSERT INTO categorias (nombre, descripcion, categoria_padre_id) VALUES (?, ?, ?) RETURNING id"
    )
    .bind(&categoria.nombre)
    .bind(&categoria.descripcion)
    .bind(categoria.categoria_padre_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error creating category: {}", e))?;

    Ok(Categoria {
        id: category_id,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        categoria_padre_id: categoria.categoria_padre_id,
    })
}

pub async fn get_product_by_id(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<Producto, String> {
    let row = sqlx::query(
        r#"
        SELECT p.id, p.nombre, p.descripcion, p.costo, p.precio_compra,
               COALESCE(i.quantity, 0) as stock, p.categoria_id, p.tags,
               (SELECT GROUP_CONCAT(pf.contenido_base64, '|||') FROM (
                   SELECT contenido_base64 FROM producto_fotos
                   WHERE producto_id = p.id ORDER BY orden LIMIT 3
               ) pf) as fotos
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.id = ?
        "#,
    )
    .bind(product_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error fetching product: {}", e))?;

    let fotos_str: Option<String> = row.try_get("fotos").unwrap_or(None);
    let fotos = fotos_str
        .map(|s| s.split("|||").filter(|s| !s.is_empty()).map(String::from).collect())
        .unwrap_or_else(Vec::new);

    Ok(Producto {
        id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
        nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
        descripcion: row.try_get("descripcion").ok(),
        costo: row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
        precio_compra: row.try_get("precio_compra").ok(),
        stock: row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
        categoria_id: row.try_get("categoria_id").ok(),
        tags: row.try_get("tags").ok(),
        fotos,
    })
}

pub async fn delete_category(
    pool: &SqlitePool,
    categoria_id: i32,
) -> Result<(), String> {
    sqlx::query("DELETE FROM categorias WHERE id = ?")
        .bind(categoria_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting category: {}", e))?;

    Ok(())
}

// Get all category IDs in a hierarchy (including all descendants)
pub async fn get_category_hierarchy_ids(
    pool: &SqlitePool,
    categoria_id: i32,
) -> Result<Vec<i32>, String> {
    let mut result = vec![categoria_id];
    let mut to_process = vec![categoria_id];
    
    while !to_process.is_empty() {
        let current_id = to_process.pop().unwrap();
        
        // Get direct children of current category
        let children: Vec<i32> = sqlx::query_scalar("SELECT id FROM categorias WHERE categoria_padre_id = ?")
            .bind(current_id)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Error getting category children: {}", e))?;
        
        for child_id in children {
            result.push(child_id);
            to_process.push(child_id);
        }
    }
    
    Ok(result)
}

// Get products filtered by category hierarchy
#[allow(dead_code)]
pub async fn get_products_by_category_hierarchy(
    pool: &SqlitePool,
    categoria_id: i32,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<ProductoResponse, String> {
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    // Get all category IDs in the hierarchy
    let category_ids = get_category_hierarchy_ids(pool, categoria_id).await?;
    
    if category_ids.is_empty() {
        // Return empty result if no categories found
        return Ok(ProductoResponse {
            data: vec![],
            total: 0,
            low_stock: 0,
            out_of_stock: 0,
        });
    }

    // Build dynamic query with proper parameter binding
    // Note: We don't actually use placeholders variable, but keeping it for now
    let _placeholders = category_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    
    // Get total count
    let mut count_query_builder = sqlx::QueryBuilder::new("SELECT COUNT(*) FROM productos WHERE categoria_id IN (");
    for (i, id) in category_ids.iter().enumerate() {
        if i > 0 {
            count_query_builder.push(", ");
        }
        count_query_builder.push_bind(id);
    }
    count_query_builder.push(")");
    
    let total: i32 = count_query_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting total count: {}", e))?;

    // Get products with photos and current inventory (up to 3 photos per product)
    let mut products_query_builder = sqlx::QueryBuilder::new(
        "SELECT p.id, p.nombre, p.descripcion, p.costo, 
               COALESCE(i.quantity, 0) as stock, p.categoria_id, p.tags,
               (SELECT GROUP_CONCAT(pf.contenido_base64, '|||') FROM (
                   SELECT contenido_base64 FROM producto_fotos
                   WHERE producto_id = p.id ORDER BY orden LIMIT 3
               ) pf) as fotos
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.categoria_id IN ("
    );
    
    for (i, id) in category_ids.iter().enumerate() {
        if i > 0 {
            products_query_builder.push(", ");
        }
        products_query_builder.push_bind(id);
    }
    
    products_query_builder.push(") ORDER BY p.id DESC LIMIT ");
    products_query_builder.push_bind(page_size);
    products_query_builder.push(" OFFSET ");
    products_query_builder.push_bind(offset);
    
    let query = products_query_builder.build();
    let rows = query.fetch_all(pool).await
        .map_err(|e| format!("Error fetching products: {}", e))?;

    let mut data = Vec::new();
    for row in rows {
        let fotos_str: Option<String> = row.try_get("fotos").unwrap_or(None);
        let fotos = fotos_str
            .map(|s| s.split("|||").filter(|s| !s.is_empty()).map(String::from).collect())
            .unwrap_or_else(Vec::new);

        data.push(Producto {
            id: row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?,
            nombre: row.try_get("nombre").map_err(|e| format!("Error getting nombre: {}", e))?,
            descripcion: row.try_get("descripcion").ok(),
            costo: row.try_get("costo").map_err(|e| format!("Error getting costo: {}", e))?,
            precio_compra: row.try_get("precio_compra").ok(),
            stock: row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?,
            categoria_id: row.try_get("categoria_id").ok(),
            tags: row.try_get("tags").ok(),
            fotos,
        });
    }

    // Calculate low stock and out of stock using inventory data
    let mut low_stock_query_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM productos p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.categoria_id IN ("
    );
    
    for (i, id) in category_ids.iter().enumerate() {
        if i > 0 {
            low_stock_query_builder.push(", ");
        }
        low_stock_query_builder.push_bind(id);
    }
    
    low_stock_query_builder.push(") AND COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= 5");
    
    let low_stock: i32 = low_stock_query_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting low stock count: {}", e))?;

    let mut out_of_stock_query_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM productos p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.categoria_id IN ("
    );
    
    for (i, id) in category_ids.iter().enumerate() {
        if i > 0 {
            out_of_stock_query_builder.push(", ");
        }
        out_of_stock_query_builder.push_bind(id);
    }
    
    out_of_stock_query_builder.push(") AND COALESCE(i.quantity, 0) = 0");
    
    let out_of_stock: i32 = out_of_stock_query_builder.build_query_scalar().fetch_one(pool).await
        .map_err(|e| format!("Error getting out of stock count: {}", e))?;

    Ok(ProductoResponse {
        data,
        total,
        low_stock,
        out_of_stock,
    })
}
