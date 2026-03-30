-- Create inventory table
CREATE TABLE inventory (
    product_id INTEGER PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES productos (id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
