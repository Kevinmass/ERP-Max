export interface InventoryItem {
    product_id: number;
    product_name: string;
    quantity: number;
    min_stock_level: number;
    is_low_stock: boolean;
}

export interface InventoryResponse {
    data: InventoryItem[];
}

export interface UpdateStockRequest {
    product_id: number;
    quantity: number;
}
