export interface InventoryItem {
    product_id: number;
    product_name: string;
    quantity: number;
    min_stock_level: number;
    is_low_stock: boolean;
    categoria_id?: number | null;
    thumbnail?: string | null;
}

export interface InventoryResponse {
    data: InventoryItem[];
}

export interface UpdateStockRequest {
    product_id: number;
    quantity: number;
}
