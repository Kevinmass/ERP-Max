use serde::{Deserialize, Serialize};

// Inventory model
#[derive(Serialize, Debug, Clone)]
pub struct Inventory {
    pub product_id: i32,
    pub quantity: i32,
    pub min_stock_level: i32,
}

// Inventory item with product information (for list view)
#[derive(Serialize, Debug, Clone)]
pub struct InventoryItem {
    pub product_id: i32,
    pub product_name: String,
    pub quantity: i32,
    pub min_stock_level: i32,
    pub is_low_stock: bool,
}

// Response for inventory list
#[derive(Serialize, Debug)]
pub struct InventoryResponse {
    pub data: Vec<InventoryItem>,
}

// DTO for updating stock manually
#[derive(Deserialize, Debug)]
pub struct UpdateStockRequest {
    pub product_id: i32,
    pub quantity: i32,
}

// DTO for adjusting stock (internal use, e.g., from sales)
#[derive(Deserialize, Debug)]
pub struct AdjustStockRequest {
    pub product_id: i32,
    pub delta: i32, // positive to increase, negative to decrease
}
