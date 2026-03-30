import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Producto, ProductoResponse, Categoria } from '../catalogue/types';
import type { InventoryResponse, InventoryItem } from '../stock/types';
import type { CartItem, CrearVenta, VentaResponse } from './types';
import CartSidebar from './CartSidebar';
import FloatingCheckoutButton from './FloatingCheckoutButton';
import ProductGrid from './ProductGrid';

// Helper function to get category level for indentation
const getCategoryLevel = (categoria: Categoria, categorias: Categoria[]): number => {
    let level = 0;
    let currentParentId = categoria.categoria_padre_id;
    
    while (currentParentId) {
        const parent = categorias.find(cat => cat.id === currentParentId);
        if (parent) {
            level++;
            currentParentId = parent.categoria_padre_id;
        } else {
            break;
        }
    }
    
    return level;
};

// Helper function to check if category has children
const hasChildren = (categoriaId: number, categorias: Categoria[]): boolean => {
    return categorias.some(cat => cat.categoria_padre_id === categoriaId);
};

export default function POSInterface() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [isCartVisible, setIsCartVisible] = useState(false);

    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedSetSearchTerm = useCallback((value: string) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
        }, 300);
    }, []);

    // Initialize on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    // Search and category filter - triggers new database call
    useEffect(() => {
        searchProducts();
    }, [searchTerm, selectedCategory]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [categoriasResponse, inventoryResponse] = await Promise.all([
                invoke<Categoria[]>('get_categorias'),
                invoke<InventoryResponse>('get_inventory_list')
            ]);

            setCategorias(categoriasResponse);
            setInventory(inventoryResponse.data);
            
            // Load all products initially (no search, no category filter)
            const allProductsResponse = await invoke<ProductoResponse>('get_productos', { 
                page: 1, 
                page_size: 1000 
            });
            setProductos(allProductsResponse.data);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchProducts = async () => {
        if (!searchTerm && selectedCategory === 'all') {
            // If no search and no category filter, don't query again
            return;
        }

        try {
            setLoading(true);
            console.log('🔍 Searching with:', { searchTerm, selectedCategory });
            
            const params: Record<string, any> = {
                page: 1,
                page_size: 1000
            };

            // Add search query if present
            if (searchTerm.trim()) {
                params.search_query = searchTerm.trim();
            }

            // Add category filter if not 'all'
            if (selectedCategory !== 'all') {
                params.categoria_id = parseInt(selectedCategory, 10);
            }

            console.log('📤 Request params:', params);
            
            const productosResponse = await invoke<ProductoResponse>('get_productos', params);
            console.log('📥 Response:', productosResponse.data.length, 'productos');
            
            setProductos(productosResponse.data);
        } catch (error) {
            console.error('❌ Error searching products:', error);
        } finally {
            setLoading(false);
        }
    };

    // Create inventory map for quick lookup
    const inventoryMap = new Map<number, number>();
    inventory.forEach(item => {
        inventoryMap.set(item.product_id, item.quantity);
    });

    // Get unique categories for filtering with hierarchy
    const categoryOptions = [
        { id: 'all', nombre: 'Todos' },
        ...categorias.map(cat => {
            const level = getCategoryLevel(cat, categorias);
            const isParent = hasChildren(cat.id, categorias);
            const indent = '─'.repeat(level);
            const icon = isParent ? '📁' : '📄';
            
            return {
                id: cat.id.toString(),
                nombre: `${indent} ${icon} ${cat.nombre}`
            };
        })
    ];

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if typing in input fields
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // 'C' key to toggle cart
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                setIsCartVisible(!isCartVisible);
            }

            // 'S' key to focus search
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // 'Escape' key to close cart
            if (e.key === 'Escape' && isCartVisible) {
                setIsCartVisible(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCartVisible]);

    const filteredProducts = productos;

    const addToCart = (producto: Producto) => {
        const currentStock = inventoryMap.get(producto.id) || 0;
        const existingCartItem = cart.find(item => item.producto_id === producto.id);

        if (existingCartItem) {
            setCart(cart.map(item =>
                item.producto_id === producto.id
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                producto_id: producto.id,
                nombre: producto.nombre,
                costo: producto.costo,
                cantidad: 1,
                stock: currentStock
            }]);
        }
    };

    const updateCartQuantity = (producto_id: number, cantidad: number) => {
        if (cantidad <= 0) {
            setCart(cart.filter(item => item.producto_id !== producto_id));
            return;
        }

        setCart(cart.map(item =>
            item.producto_id === producto_id
                ? { ...item, cantidad }
                : item
        ));
    };

    const updateCartPrice = (producto_id: number, precio_modificado: number) => {
        setCart(cart.map(item =>
            item.producto_id === producto_id
                ? { 
                    ...item, 
                    costo_modificado: precio_modificado > 0 ? precio_modificado : undefined 
                }
                : item
        ));
    };

    const handleCheckout = async (customerData: {
        nombre?: string;
        domicilio?: string;
        localidad?: string;
        telefono?: string;
        fecha_entrega?: string;
        observaciones?: string;
    }) => {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        try {
            setCheckoutLoading(true);
            const saleData: CrearVenta = {
                items: cart.map(item => ({
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_modificado: item.costo_modificado
                })),
                cliente_nombre: customerData.nombre || undefined,
                cliente_domicilio: customerData.domicilio || undefined,
                cliente_localidad: customerData.localidad || undefined,
                cliente_telefono: customerData.telefono || undefined,
                observaciones: customerData.observaciones || undefined,
            };

            const result = await invoke<VentaResponse>('register_sale', { saleData });
            alert(`Venta registrada exitosamente. Total: $${result.venta.total.toFixed(2)}`);
            setCart([]); // Clear cart
            setIsCartVisible(false); // Hide cart after successful checkout
        } catch (error) {
            console.error('Error registering sale:', error);
            alert('Error al registrar la venta');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        
        if (confirm('¿Estás seguro de que deseas limpiar el carrito?')) {
            setCart([]);
        }
    };

    const handleToggleCart = () => {
        setIsCartVisible(!isCartVisible);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Punto de Venta</h2>
                    <p className="text-gray-600 mt-1">Selecciona productos para agregar al carrito</p>
                </div>
                
                <div className="flex items-center space-x-4">
                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            debouncedSetSearchTerm(e.target.value);
                        }}
                        className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-2 text-gray-400">
                        🔍
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 font-medium">Categoría:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {categoryOptions.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                    {/* Cart Toggle Button */}
                    <button
                        onClick={handleToggleCart}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                            isCartVisible
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        🛒 Carrito ({cart.length})
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative" style={{ 
                paddingRight: isCartVisible ? `calc(24rem * var(--font-scale-base))` : '0',
                minHeight: '60vh' // Ensure minimum height for better layout
            }}>
                {/* Product Grid - Responsive layout that adapts to font scaling */}
                <div className="transition-all duration-300">
                    <ProductGrid
                        productos={filteredProducts}
                        onAddToCart={addToCart}
                        loading={loading}
                        categorias={categorias}
                        inventoryMap={inventoryMap}
                    />
                </div>

                {/* Cart Sidebar */}
                <CartSidebar
                    cart={cart}
                    onUpdateQuantity={updateCartQuantity}
                    onUpdatePrice={updateCartPrice}
                    onCheckout={handleCheckout}
                    onClearCart={handleClearCart}
                    isVisible={isCartVisible}
                    onToggleVisibility={handleToggleCart}
                    isLoading={checkoutLoading}
                />
            </div>

            {/* Floating Checkout Button - Always accessible regardless of font size */}
            <FloatingCheckoutButton
                cart={cart}
                onCheckout={handleCheckout}
                onToggleCart={handleToggleCart}
                isLoading={checkoutLoading}
            />

            {/* Keyboard Shortcuts Help */}
            <div className="fixed bottom-20 right-6 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs text-gray-600 hidden lg:block">
                <div className="font-medium mb-1">Atajos de teclado:</div>
                <div className="space-y-1">
                    <div><span className="bg-gray-100 px-1 rounded">C</span> - Mostrar/Ocultar carrito</div>
                    <div><span className="bg-gray-100 px-1 rounded">S</span> - Enfocar búsqueda</div>
                    <div><span className="bg-gray-100 px-1 rounded">Esc</span> - Cerrar carrito</div>
                </div>
            </div>
        </div>
    );
}
