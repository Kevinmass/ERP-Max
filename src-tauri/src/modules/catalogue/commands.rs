use sqlx::SqlitePool;
use tauri::State;
use serde::Deserialize;
use crate::modules::catalogue::models::{ProductoResponse, Producto, Categoria, CrearProducto, ActualizarProducto, CrearCategoria};
use crate::modules::catalogue::service;
use crate::modules::catalogue::db::{self, ReimportarPreciosResult};
use crate::modules::product_matching::parser;
use printpdf::*;

// Request struct for filtering products
#[derive(Deserialize, Debug)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct GetProductosParams {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub search_query: Option<String>,
    pub categoria_id: Option<i32>,
}

// Note: Assuming the SqlitePool is stored in Tauri state as 'pool'
// The shell/main.rs will need to manage the database connection

#[tauri::command]
pub async fn get_productos(
    pool: State<'_, SqlitePool>,
    page: Option<i32>,
    #[allow(non_snake_case)]
    pageSize: Option<i32>,
    #[allow(non_snake_case)]
    searchQuery: Option<String>,
    #[allow(non_snake_case)]
    categoriaId: Option<i32>,
    #[allow(non_snake_case)]
    includeFotos: Option<bool>,
) -> Result<ProductoResponse, String> {
    service::get_products_service(&pool, page, pageSize, searchQuery, categoriaId, includeFotos).await
}

#[tauri::command]
pub async fn create_producto(
    pool: State<'_, SqlitePool>,
    producto: CrearProducto,
) -> Result<Producto, String> {
    service::create_product_service(&pool, producto).await
}

#[tauri::command]
pub async fn update_producto(
    pool: State<'_, SqlitePool>,
    producto: ActualizarProducto,
) -> Result<Producto, String> {
    service::update_product_service(&pool, producto).await
}

#[tauri::command]
pub async fn delete_producto(
    pool: State<'_, SqlitePool>,
    product_id: i32,
) -> Result<(), String> {
    service::delete_product_service(&pool, product_id).await
}

#[tauri::command]
pub async fn get_categorias(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Categoria>, String> {
    service::get_categories_service(&pool).await
}

#[tauri::command]
pub async fn create_categoria(
    pool: State<'_, SqlitePool>,
    categoria: CrearCategoria,
) -> Result<Categoria, String> {
    service::create_category_service(&pool, categoria).await
}

#[tauri::command]
pub async fn delete_categoria(
    pool: State<'_, SqlitePool>,
    categoria_id: i32,
) -> Result<(), String> {
    service::delete_category_service(&pool, categoria_id).await
}

#[tauri::command]
pub async fn get_producto_by_id(
    pool: State<'_, SqlitePool>,
    product_id: i32,
) -> Result<Producto, String> {
    service::get_product_by_id_service(&pool, product_id).await
}

#[tauri::command]
#[allow(dead_code)]
pub async fn get_productos_by_category_hierarchy(
    pool: State<'_, SqlitePool>,
    categoria_id: i32,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<ProductoResponse, String> {
    service::get_products_by_category_hierarchy_service(&pool, categoria_id, page, page_size).await
}

#[tauri::command]
pub async fn migrate_product_stock_to_inventory(
    pool: State<'_, SqlitePool>,
) -> Result<(), String> {
    service::migrate_product_stock_to_inventory_service(&pool).await
}

/// Apply a bulk percentage price adjustment to the selected products.
#[tauri::command]
pub async fn aplicar_ajuste_precios(
    pool: State<'_, SqlitePool>,
    #[allow(non_snake_case)]
    productIds: Vec<i32>,
    porcentaje: f64,
    #[allow(non_snake_case)]
    desdeCosto: Option<bool>,
) -> Result<i32, String> {
    service::aplicar_ajuste_precios_service(&pool, productIds, porcentaje, desdeCosto.unwrap_or(false)).await
}

/// Export catalogue to Excel format (CSV with .xlsx extension for compatibility)
/// This file can be reimported to update prices
#[tauri::command]
pub async fn exportar_catalogo_excel(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<u8>, String> {
    let products = db::get_all_products_for_export(&pool).await?;
    
    // Create CSV content (Excel can open CSV files)
    // Format: Nombre,Precio,Descripcion,Stock,Categoria,Tags (removed ID column for better reimport compatibility)
    let mut csv_content = String::new();
    csv_content.push_str("Nombre,Precio,Descripcion,Stock,Categoria,Tags\n");
    
    for product in &products {
        let descripcion = product.descripcion.clone().unwrap_or_default().replace("\"", "\"\"");
        let nombre = product.nombre.replace("\"", "\"\"");
        let categoria = product.categoria_nombre.clone().unwrap_or_default().replace("\"", "\"\"");
        let tags = product.tags.clone().unwrap_or_default().replace("\"", "\"\"");
        
        csv_content.push_str(&format!(
            "\"{}\",{},\"{}\",{},\"{}\",\"{}\"\n",
            nombre,
            product.costo,
            descripcion,
            product.stock,
            categoria,
            tags
        ));
    }
    
    Ok(csv_content.into_bytes())
}

/// Export catalogue to PDF format with category organization
#[tauri::command]
pub async fn exportar_catalogo_pdf(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<u8>, String> {
    let categories_with_products = db::get_products_grouped_by_category(&pool).await?;
    
    // Create PDF using printpdf
    let (doc, page1, layer1) = PdfDocument::new(
        "Catalogo de Productos",
        Mm(210.0),  // A4 width
        Mm(297.0),  // A4 height
        "Layer 1"
    );
    
    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    
    // Use built-in font
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| format!("Error loading font: {}", e))?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| format!("Error loading bold font: {}", e))?;
    
    // Initial Y position for content
    let mut y_pos = 255.0;
    let mut current_page = 1;
    let total_pages = estimate_pages_needed(&categories_with_products);
    
    // Add title and total count to first page
    current_layer.use_text("Catálogo de Productos", 24.0, Mm(20.0), Mm(277.0), &font_bold);
    let total_products: i32 = categories_with_products.iter().map(|c| c.productos.len() as i32).sum();
    current_layer.use_text(&format!("Total de productos: {}", total_products), 12.0, Mm(20.0), Mm(268.0), &font);
    current_layer.use_text(&format!("Página {} de {}", current_page, total_pages), 10.0, Mm(170.0), Mm(10.0), &font);
    
    // Process categories and products
    for category in categories_with_products {
        // Check if category has products
        if category.productos.is_empty() {
            continue;
        }
        
        // Add category section header
        if !add_category_header(&mut current_layer, &category, &font, &font_bold, &mut y_pos, &mut current_page, total_pages, &doc)? {
            // If we couldn't add header (likely due to page break), try again
            continue;
        }
        
        // Add table header for products
        if !add_product_table_header(&mut current_layer, &font, &font_bold, &mut y_pos)? {
            continue;
        }
        
        // Add products for this category
        for product in &category.productos {
            if !add_product_row(&mut current_layer, product, &font, &font_bold, &mut y_pos, &mut current_page, total_pages, &doc)? {
                // If we couldn't add product row (likely due to page break), try again
                continue;
            }
        }
        
        // Add section break after category (except for last category)
        add_section_break(&mut current_layer, &mut y_pos);
    }
    
    // Save PDF to bytes
    let mut buffer = std::io::Cursor::new(Vec::new());
    {
        let mut writer = std::io::BufWriter::new(&mut buffer);
        doc.save(&mut writer)
            .map_err(|e| format!("Error saving PDF: {}", e))?;
    }
    let bytes = buffer.into_inner();
    
    Ok(bytes)
}

/// Estimate total pages needed for the PDF
fn estimate_pages_needed(categories: &[crate::modules::catalogue::models::CategoryWithProducts]) -> i32 {
    let mut total_items = 0;
    
    for category in categories {
        if !category.productos.is_empty() {
            total_items += 1; // Category header
            total_items += 1; // Table header
            total_items += category.productos.len(); // Products
            total_items += 1; // Section break
        }
    }
    
    // Estimate: ~38 items per page
    ((total_items as f32) / 38.0).ceil() as i32
}

/// Add category header with hierarchy indication
fn add_category_header(
    layer: &mut printpdf::PdfLayerReference,
    category: &crate::modules::catalogue::models::CategoryWithProducts,
    font: &printpdf::IndirectFontRef,
    font_bold: &printpdf::IndirectFontRef,
    y_pos: &mut f64,
    current_page: &mut i32,
    total_pages: i32,
    doc: &printpdf::PdfDocumentReference,
) -> Result<bool, String> {
    // Check if we need a new page
    if *y_pos < 40.0 {
        *current_page += 1;
        let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
        *layer = doc.get_page(new_page).get_layer(new_layer);
        
        // Add title and page number to new page
        layer.use_text("Catálogo de Productos", 24.0, Mm(20.0), Mm(277.0), font_bold);
        layer.use_text(&format!("Página {} de {}", current_page, total_pages), 10.0, Mm(170.0), Mm(10.0), font);
        
        *y_pos = 255.0;
    }
    
    // Create category name with hierarchy indication
    let mut category_name = category.nombre.clone();
    if category.level > 0 {
        let indent = "→ ".repeat(category.level as usize);
        category_name = format!("{}{}", indent, category_name);
    }
    
    // Add category header
    layer.use_text(&category_name, 14.0, Mm(20.0), Mm(*y_pos), font_bold);
    *y_pos -= 8.0;
    
    // Add description if available
    if let Some(desc) = &category.descripcion {
        if !desc.trim().is_empty() {
            layer.use_text(desc, 10.0, Mm(20.0), Mm(*y_pos), font);
            *y_pos -= 6.0;
        }
    }
    
    Ok(true)
}

/// Add product table header
fn add_product_table_header(
    layer: &mut printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    font_bold: &printpdf::IndirectFontRef,
    y_pos: &mut f64,
) -> Result<bool, String> {
    // Table header (without ID column)
    layer.use_text("Nombre", 10.0, Mm(20.0), Mm(*y_pos), font_bold);
    layer.use_text("Precio", 10.0, Mm(105.0), Mm(*y_pos), font_bold);
    layer.use_text("Stock", 10.0, Mm(140.0), Mm(*y_pos), font_bold);
    layer.use_text("Categoria", 10.0, Mm(160.0), Mm(*y_pos), font_bold);
    
    *y_pos -= 5.0;
    
    // Draw header line
    let line = Line {
        points: vec![
            (Point::new(Mm(20.0), Mm(*y_pos + 2.0)), false),
            (Point::new(Mm(190.0), Mm(*y_pos + 2.0)), false),
        ],
        is_closed: false,
        has_fill: false,
        has_stroke: true,
        is_clipping_path: false,
    };
    layer.add_shape(line);
    
    *y_pos -= 5.0;
    
    Ok(true)
}

/// Add a product row to the PDF
fn add_product_row(
    layer: &mut printpdf::PdfLayerReference,
    product: &crate::modules::catalogue::models::ProductoExport,
    font: &printpdf::IndirectFontRef,
    font_bold: &printpdf::IndirectFontRef,
    y_pos: &mut f64,
    current_page: &mut i32,
    total_pages: i32,
    doc: &printpdf::PdfDocumentReference,
) -> Result<bool, String> {
    // Check if we need a new page
    if *y_pos < 30.0 {
        *current_page += 1;
        let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
        *layer = doc.get_page(new_page).get_layer(new_layer);
        
        // Add title and page number to new page
        layer.use_text("Catálogo de Productos", 24.0, Mm(20.0), Mm(277.0), font_bold);
        layer.use_text(&format!("Página {} de {}", current_page, total_pages), 10.0, Mm(170.0), Mm(10.0), font);
        
        *y_pos = 255.0;
    }
    
    // Truncate long names
    let nombre = if product.nombre.len() > 35 {
        format!("{}...", &product.nombre[..32])
    } else {
        product.nombre.clone()
    };
    
    let categoria = product.categoria_nombre.clone().unwrap_or_default();
    
    // Add product data (without ID column)
    layer.use_text(&nombre, 9.0, Mm(20.0), Mm(*y_pos), font);
    layer.use_text(&format!("${:.2}", product.costo), 9.0, Mm(105.0), Mm(*y_pos), font);
    layer.use_text(&product.stock.to_string(), 9.0, Mm(140.0), Mm(*y_pos), font);
    layer.use_text(&categoria, 9.0, Mm(160.0), Mm(*y_pos), font);
    
    *y_pos -= 6.0;
    
    Ok(true)
}

/// Add visual section break between categories
fn add_section_break(
    layer: &mut printpdf::PdfLayerReference,
    y_pos: &mut f64,
) {
    // Add some spacing
    *y_pos -= 4.0;
    
    // Draw a horizontal line as section break
    let line = Line {
        points: vec![
            (Point::new(Mm(20.0), Mm(*y_pos)), false),
            (Point::new(Mm(190.0), Mm(*y_pos)), false),
        ],
        is_closed: false,
        has_fill: false,
        has_stroke: true,
        is_clipping_path: false,
    };
    layer.add_shape(line);
    
    // Add more spacing after the line
    *y_pos -= 8.0;
}

/// Reimport prices from Excel file
/// The Excel must have columns: Nombre, Precio (matching the export format)
#[tauri::command]
pub async fn reimportar_precios_catalogo(
    pool: State<'_, SqlitePool>,
    archivo_contenido: Vec<u8>,
    nombre_archivo: String,
) -> Result<ReimportarPreciosResult, String> {
    // Parse the Excel/CSV file
    let productos_precios = parser::parse_file(&archivo_contenido, &nombre_archivo)
        .map_err(|e| format!("Error parsing file: {}", e))?;
    
    let mut actualizados = 0;
    let mut errores = Vec::new();
    
    // Get current products for matching
    let productos_actuales = db::get_all_products_for_export(&pool).await?;
    
    for producto_precio in &productos_precios {
        // Try to match by name
        let matched_product = productos_actuales.iter().find(|p| 
            p.nombre.to_lowercase() == producto_precio.nombre.to_lowercase()
        );
        
        if let Some(producto) = matched_product {
            if let Some(nuevo_precio) = producto_precio.precio {
                match db::update_product_price_by_id(&pool, producto.id, nuevo_precio).await {
                    Ok(_) => actualizados += 1,
                    Err(e) => errores.push(format!("{}: {}", producto_precio.nombre, e)),
                }
            }
        } else {
            errores.push(format!("Producto no encontrado: {}", producto_precio.nombre));
        }
    }
    
    Ok(ReimportarPreciosResult {
        total_procesados: productos_precios.len() as i32,
        actualizados,
        errores,
    })
}
