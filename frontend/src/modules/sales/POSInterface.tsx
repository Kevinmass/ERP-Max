import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLayout } from '../../context/LayoutContext';
import { useToast } from '../../context/ToastContext';
import type { Producto, ProductoResponse, Categoria } from '../catalogue/types';
import type { InventoryResponse, InventoryItem } from '../stock/types';
import type { CartItem, CrearVenta, VentaResponse } from './types';
import CartSidebar from './CartSidebar';
import ProductGrid from './ProductGrid';
import ReceiptCard from './ReceiptCard';

const PAGE_SIZE = 20;

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
    const [saleReceipt, setSaleReceipt] = useState<VentaResponse | null>(null);
    const [page, setPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { showToast } = useToast();

    // Keyboard shortcuts card is pointer-events-none (purely informative, must never
    // block clicks on controls underneath), so hover-to-fade is done via cursor position
    // rather than onMouseEnter/Leave (which never fire on a pointer-events-none element).
    const shortcutsRef = useRef<HTMLDivElement>(null);
    const [isOverShortcuts, setIsOverShortcuts] = useState(false);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const rect = shortcutsRef.current?.getBoundingClientRect();
            if (!rect) return;
            const inside = e.clientX >= rect.left && e.clientX <= rect.right
                && e.clientY >= rect.top && e.clientY <= rect.bottom;
            setIsOverShortcuts(inside);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // POS focus mode: auto-collapse the sidebar to maximize grid space,
    // restore whatever the user had when leaving this screen.
    const { setSidebarCollapsed } = useLayout();
    const priorSidebarCollapsed = useRef<boolean | null>(null);
    useEffect(() => {
        if (priorSidebarCollapsed.current === null) {
            const saved = localStorage.getItem('sidebar-collapsed');
            priorSidebarCollapsed.current = saved ? JSON.parse(saved) : false;
        }
        setSidebarCollapsed(true);
        return () => {
            setSidebarCollapsed(priorSidebarCollapsed.current ?? false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const debouncedSetSearchTerm = useCallback((value: string) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
        }, 300);
    }, []);

    // Categorias + inventory once on mount.
    useEffect(() => {
        loadReferenceData();
        searchInputRef.current?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Products: refetch (page 1) whenever the filter/search changes.
    useEffect(() => {
        fetchProducts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, selectedCategory]);

    const loadReferenceData = async () => {
        try {
            const [categoriasResponse, inventoryResponse] = await Promise.all([
                invoke<Categoria[]>('get_categorias'),
                invoke<InventoryResponse>('get_inventory_list')
            ]);
            setCategorias(categoriasResponse);
            setInventory(inventoryResponse.data);
        } catch (error) {
            console.error('Error loading reference data:', error);
        }
    };

    // NOTE: params are camelCase — the Rust command ignores snake_case keys,
    // which is why the POS previously always showed only the first 20 products.
    const fetchProducts = async (targetPage: number) => {
        try {
            setLoading(true);
            const response = await invoke<ProductoResponse>('get_productos', {
                page: targetPage,
                pageSize: PAGE_SIZE,
                searchQuery: searchTerm.trim() !== '' ? searchTerm.trim() : undefined,
                categoriaId: selectedCategory !== 'all' ? parseInt(selectedCategory, 10) : undefined,
                includeFotos: true,
            });
            setProductos(response.data);
            setTotalProducts(response.total);
            setPage(targetPage);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));

    // Inventory map for quick lookup
    const inventoryMap = new Map<number, number>();
    inventory.forEach(item => {
        inventoryMap.set(item.product_id, item.quantity);
    });

    const categoryChips = [
        { id: 'all', nombre: 'Todos' },
        ...categorias.map(cat => ({ id: cat.id.toString(), nombre: cat.nombre }))
    ];

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

    // Enter on the search adds the first result of the current page.
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim() && productos.length > 0) {
            e.preventDefault();
            addToCart(productos[0]);
            setInputValue('');
            setSearchTerm('');
        }
    };

    const updateCartQuantity = (producto_id: number, cantidad: number) => {
        if (cantidad <= 0) {
            setCart(cart.filter(item => item.producto_id !== producto_id));
            return;
        }
        setCart(cart.map(item =>
            item.producto_id === producto_id ? { ...item, cantidad } : item
        ));
    };

    const updateCartPrice = (producto_id: number, precio_modificado: number) => {
        setCart(cart.map(item =>
            item.producto_id === producto_id
                ? { ...item, costo_modificado: precio_modificado > 0 ? precio_modificado : undefined }
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
            showToast('El carrito está vacío', 'info');
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
            setCart([]);
            setSaleReceipt(result); // the one expressive moment (§5)
        } catch (error) {
            console.error('Error registering sale:', error);
            showToast('Error al registrar la venta', 'error');
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

    const handleToggleCart = () => setIsCartVisible(!isCartVisible);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F12') {
                e.preventDefault();
                if (cart.length > 0 && !checkoutLoading) {
                    handleCheckout({});
                }
                return;
            }

            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                setIsCartVisible(!isCartVisible);
            }

            if (e.key === 'Escape' && isCartVisible) {
                setIsCartVisible(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCartVisible, cart, checkoutLoading]);

    return (
        <div className="space-y-4">
            {/* Toolbar: search + cart toggle */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar productos... ( / )"
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            debouncedSetSearchTerm(e.target.value);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                </div>

                <button
                    onClick={handleToggleCart}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-1.5 shrink-0 ${
                        isCartVisible
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <ShoppingCart className="w-4 h-4" strokeWidth={1.5} /> Carrito ({cart.length})
                </button>
            </div>

            {/* Category chips — single scrollable row, capped to one line */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {categoryChips.map(chip => (
                    <button
                        key={chip.id}
                        onClick={() => setSelectedCategory(chip.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                            selectedCategory === chip.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {chip.nombre}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="relative" style={{
                paddingRight: isCartVisible ? `calc(24rem * var(--font-scale-base))` : '0',
                minHeight: '50vh'
            }}>
                <div className="transition-all duration-300">
                    {totalPages > 1 && (
                        <PaginationBar
                            page={page}
                            totalPages={totalPages}
                            totalProducts={totalProducts}
                            loading={loading}
                            onPrev={() => fetchProducts(page - 1)}
                            onNext={() => fetchProducts(page + 1)}
                            className="mb-3 px-1"
                        />
                    )}

                    <ProductGrid
                        productos={productos}
                        onAddToCart={addToCart}
                        loading={loading}
                        categorias={categorias}
                        inventoryMap={inventoryMap}
                    />

                    {totalPages > 1 && (
                        <PaginationBar
                            page={page}
                            totalPages={totalPages}
                            totalProducts={totalProducts}
                            loading={loading}
                            onPrev={() => fetchProducts(page - 1)}
                            onNext={() => fetchProducts(page + 1)}
                            className="mt-6 px-1"
                        />
                    )}
                </div>

                {saleReceipt ? (
                    <ReceiptCard venta={saleReceipt} onDismiss={() => setSaleReceipt(null)} />
                ) : (
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
                )}
            </div>

            {/* Keyboard shortcuts help — purely informative: pointer-events-none so it can never
                intercept clicks meant for controls underneath (e.g. the pagination buttons) */}
            <div
                ref={shortcutsRef}
                className={`fixed bottom-16 right-6 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs text-gray-600 hidden xl:block pointer-events-none transition-opacity duration-160 ${
                    isOverShortcuts ? 'opacity-10' : 'opacity-100'
                }`}
            >
                <div className="font-medium mb-1">Atajos de teclado:</div>
                <div className="space-y-1">
                    <div><span className="bg-gray-100 px-1 rounded font-mono">/</span> - Enfocar búsqueda</div>
                    <div><span className="bg-gray-100 px-1 rounded font-mono">Enter</span> - Agregar resultado</div>
                    <div><span className="bg-gray-100 px-1 rounded font-mono">F12</span> - Cobrar</div>
                    <div><span className="bg-gray-100 px-1 rounded font-mono">C</span> - Mostrar/Ocultar carrito</div>
                    <div><span className="bg-gray-100 px-1 rounded font-mono">Esc</span> - Cerrar carrito</div>
                </div>
            </div>
        </div>
    );
}

function PaginationBar({ page, totalPages, totalProducts, loading, onPrev, onNext, className }: {
    page: number;
    totalPages: number;
    totalProducts: number;
    loading: boolean;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center justify-between ${className ?? ''}`}>
            <span className="text-sm text-gray-600">
                {totalProducts} productos · página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={onPrev}
                    disabled={page === 1 || loading}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                <button
                    onClick={onNext}
                    disabled={page === totalPages || loading}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
