//! Parser module for extracting product data from supplier files (CSV and Excel)

use crate::modules::product_matching::models::ProductoProveedor;
use calamine::{Reader, Xlsx, open_workbook};
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum ParserError {
    #[error("Error reading file: {0}")]
    FileReadError(String),
    #[error("Error parsing CSV: {0}")]
    CsvError(String),
    #[error("Error parsing Excel: {0}")]
    ExcelError(String),
    #[error("Unsupported file format: {0}")]
    UnsupportedFormat(String),
}

/// Detects the file type from the filename extension
pub fn detect_file_type(filename: &str) -> Result<&'static str, ParserError> {
    let extension = filename
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    
    match extension.as_str() {
        "csv" => Ok("csv"),
        "xlsx" | "xls" => Ok("xlsx"),
        _ => Err(ParserError::UnsupportedFormat(extension)),
    }
}

/// Parse a price value from various formats
fn parse_price(value: &str) -> Option<f64> {
    if value.is_empty() {
        return None;
    }
    
    let cleaned = value
        .trim()
        .replace("$", "")
        .replace("€", "")
        .replace("£", "")
        .replace(" ", "");
    
    let normalized = if cleaned.contains(',') && !cleaned.contains('.') {
        cleaned.replace(',', ".")
    } else {
        cleaned
    };
    
    normalized.parse::<f64>().ok()
}

/// Detect delimiter in CSV (auto-detect)
fn detect_csv_delimiter(content: &str) -> u8 {
    let first_line = content.lines().next().unwrap_or("");
    
    let semicolon_count = first_line.matches(';').count();
    let comma_count = first_line.matches(',').count();
    let tab_count = first_line.matches('\t').count();
    
    if tab_count >= semicolon_count && tab_count >= comma_count {
        b'\t'
    } else if semicolon_count > comma_count {
        b';'
    } else {
        b','
    }
}

/// Parse CSV content with auto-detection of delimiter
pub fn parse_csv(content: &[u8]) -> Result<Vec<ProductoProveedor>, ParserError> {
    let content_str = String::from_utf8_lossy(content);
    let delimiter = detect_csv_delimiter(&content_str);
    
    let mut products = Vec::new();
    
    for (idx, line) in content_str.lines().enumerate() {
        if idx == 0 {
            continue;
        }
        
        let parts: Vec<&str> = line.split(delimiter as char).collect();
        
        if parts.is_empty() {
            continue;
        }
        
        let nombre = parts[0].trim().to_string();
        
        if nombre.is_empty() {
            continue;
        }
        
        let precio = parts.get(1)
            .and_then(|p| parse_price(p));
        
        let codigo = parts.get(2)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        
        let cantidad = parts.get(3)
            .and_then(|s| s.trim().parse::<i32>().ok());
        
        products.push(ProductoProveedor {
            nombre,
            precio,
            codigo,
            cantidad,
        });
    }
    
    Ok(products)
}

/// Parse Excel (XLSX) content
pub fn parse_xlsx(content: &[u8]) -> Result<Vec<ProductoProveedor>, ParserError> {
    let mut temp_dir = std::env::temp_dir();
    temp_dir.push("pm_import_temp.xlsx");
    
    std::fs::write(&temp_dir, content)
        .map_err(|e| ParserError::FileReadError(e.to_string()))?;
    
    let mut workbook: Xlsx<_> = open_workbook(&temp_dir)
        .map_err(|e: calamine::XlsxError| ParserError::ExcelError(e.to_string()))?;
    
    let sheet_name = workbook.sheet_names().first()
        .ok_or_else(|| ParserError::ExcelError("No sheets found in workbook".to_string()))?
        .clone();
    
    let range = workbook.worksheet_range(&sheet_name)
        .map_err(|e: calamine::XlsxError| ParserError::ExcelError(e.to_string()))?;
    
    let mut products = Vec::new();
    
    for row in range.rows().skip(1) {
        let nombre = row.get(0)
            .and_then(|cell| match cell {
                calamine::Data::String(s) => Some(s.clone()),
                _ => None
            })
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        
        if nombre.is_empty() {
            continue;
        }
        
        let precio = row.get(1)
            .and_then(|cell| {
                match cell {
                    calamine::Data::Float(f) => Some(*f),
                    calamine::Data::Int(i) => Some(*i as f64),
                    calamine::Data::String(s) => parse_price(s),
                    _ => None,
                }
            });
        
        let codigo = row.get(2)
            .and_then(|cell| match cell {
                calamine::Data::String(s) => Some(s.clone()),
                _ => None
            })
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        
        let cantidad = row.get(3)
            .and_then(|cell| {
                match cell {
                    calamine::Data::Float(f) => Some(*f as i32),
                    calamine::Data::Int(i) => Some(*i as i32),
                    calamine::Data::String(s) => s.trim().parse::<i32>().ok(),
                    _ => None,
                }
            });
        
        products.push(ProductoProveedor {
            nombre,
            precio,
            codigo,
            cantidad,
        });
    }
    
    let _ = std::fs::remove_file(&temp_dir);
    
    Ok(products)
}

/// Main entry point for parsing any supported file
pub fn parse_file(content: &[u8], filename: &str) -> Result<Vec<ProductoProveedor>, ParserError> {
    let file_type = detect_file_type(filename)?;
    
    match file_type {
        "csv" => parse_csv(content),
        "xlsx" => parse_xlsx(content),
        _ => Err(ParserError::UnsupportedFormat(file_type.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_detect_file_type() {
        assert_eq!(detect_file_type("test.csv").unwrap(), "csv");
        assert_eq!(detect_file_type("test.xlsx").unwrap(), "xlsx");
        assert!(detect_file_type("test.txt").is_err());
    }
    
    #[test]
    fn test_parse_price_formats() {
        assert_eq!(parse_price("100.50"), Some(100.50));
        assert_eq!(parse_price("100,50"), Some(100.50));
        assert_eq!(parse_price("$100.50"), Some(100.50));
    }
}
