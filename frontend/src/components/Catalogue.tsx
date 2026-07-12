import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ProductTable from '../modules/catalogue/ProductTable';
import ProductosGrid from '../modules/catalogue/ProductosGrid';
import ProductForm from '../modules/catalogue/ProductForm';
import type { Producto, ProductoResponse, Categoria, CrearProducto, ActualizarProducto } from '../modules/catalogue/types';
import { exportCatalogueToExcel, exportCatalogueToPdf } from '../api/catalogue';

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

// Helper function to sort categories hierarchically (recursive for any level depth)
const sortCategoriesHierarchically = (categorias: Categoria[]): Categoria[] => {
    // Get all root categories (no parent)
    const rootCategorias = categorias
        .filter(cat => !cat.categoria_padre_id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    
    const result: Categoria[] = [];
    
    // Recursive function to add category and its children
    const addCategoryAndChildren = (category: Categoria) => {
        result.push(category);
        
        // Find and sort children of this category
        const children = categorias
            .filter(cat => cat.categoria_padre_id === category.id)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        
        // Recursively add each child and their descendants
        children.forEach(child => addCategoryAndChildren(child));
    };
    
    // Add all root categories and their descendants
    rootCategorias.forEach(rootCategory => addCategoryAndChildren(rootCategory));
    
    return result;
};

// Helper function to get all descendant category IDs (recursive)
// REMOVED - Backend now handles hierarchical category filtering

export default function Catalogue() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20); // Limit to 20 products per page
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Export state
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const loadCategories = async () => {
        try {
            const categoriasResponse = await invoke<Categoria[]>('get_categorias');
            setCategorias(categoriasResponse);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    // Table view has no images, so it loads the entire filtered set at once
    // (so "select all" can cover everything). Grid view stays paginated with
    // photos, which is lighter for low-end devices.
    const TABLE_LOAD_ALL = 100000;

    const fetchProducts = async (page: number) => {
        try {
            setLoading(true);
            const isTable = viewMode === 'table';
            const response = await invoke<ProductoResponse>('get_productos', {
                page: isTable ? 1 : page,
                pageSize: isTable ? TABLE_LOAD_ALL : pageSize,
                searchQuery: searchQuery.trim() !== '' ? searchQuery : undefined,
                categoriaId: selectedCategory !== null ? selectedCategory : undefined,
                includeFotos: !isTable,
            });

            setProductos(response.data);
            setTotalProducts(response.total);
            setTotalPages(isTable ? 1 : Math.ceil(response.total / pageSize));
            setCurrentPage(isTable ? 1 : page);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load categories once on mount.
    useEffect(() => {
        loadCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refetch immediately when the category filter or view mode changes
    // (this also performs the initial product load on mount).
    useEffect(() => {
        fetchProducts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, viewMode]);

    // Debounced refetch as the user types in the search box (skips first mount).
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        const t = setTimeout(() => fetchProducts(1), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const handleSearch = () => {
        fetchProducts(1);
    };

    const handleClearFilters = () => {
        // Effects above refetch when these change.
        setSearchQuery('');
        setSelectedCategory(null);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchProducts(newPage);
        }
    };

    const handleCreateProduct = async (producto: CrearProducto | ActualizarProducto) => {
        try {
            setSaving(true);
            if ('id' in producto) {
                // Update
                await invoke<Producto>('update_producto', { producto });
            } else {
                // Create
                await invoke<Producto>('create_producto', { producto });
            }
            await handleSearch(); // Refresh data with current filters
        } catch (error) {
            console.error('Error saving product:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            return;
        }

        try {
            setSaving(true);
            await invoke('delete_producto', { productId });
            await handleSearch(); // Refresh data with current filters
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar el producto');
        } finally {
            setSaving(false);
        }
    };

    const handleEditProduct = (producto: Producto) => {
        setEditingProduct(producto);
        setShowProductForm(true);
    };

    const handleBulkAdjust = async (productIds: number[], porcentaje: number, desdeCosto: boolean) => {
        try {
            setSaving(true);
            const actualizados = await invoke<number>('aplicar_ajuste_precios', { productIds, porcentaje, desdeCosto });
            await handleSearch(); // refresh with current filters
            setNotification({ message: `${actualizados} producto(s) actualizados`, type: 'success' });
        } catch (error) {
            console.error('Error adjusting prices:', error);
            setNotification({ message: 'Error al ajustar los precios', type: 'error' });
            throw error;
        } finally {
            setSaving(false);
        }
    };

    // Export handlers with notifications
    const handleExportExcel = async () => {
        try {
            setExportLoading(true);
            setIsExportDropdownOpen(false);
            await exportCatalogueToExcel();
            setNotification({ message: 'Catálogo exportado a Excel exitosamente', type: 'success' });
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            setNotification({ message: 'Error al exportar a Excel', type: 'error' });
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            setExportLoading(true);
            setIsExportDropdownOpen(false);
            await exportCatalogueToPdf();
            setNotification({ message: 'Catálogo exportado a PDF exitosamente', type: 'success' });
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            setNotification({ message: 'Error al exportar a PDF', type: 'error' });
        } finally {
            setExportLoading(false);
        }
    };

    // Close notification after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <div className="space-y-6 min-h-screen">
            {/* Module Actions Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between lg:flex-nowrap">
                <div className="flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona tu inventario de productos y categorías
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-start lg:justify-end">
                    {/* Search Bar */}
                    <div className="relative flex-shrink-0 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            🔍
                        </div>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">Todas las categorías</option>
                        {sortCategoriesHierarchically(categorias).map(cat => {
                            const level = getCategoryLevel(cat, categorias);
                            const isParent = hasChildren(cat.id, categorias);
                            const indent = '─'.repeat(level);
                            const icon = isParent ? '📁' : '📄';
                            
                            return (
                                <option key={cat.id} value={cat.id}>
                                    {indent} {icon} {cat.nombre}
                                </option>
                            );
                        })}
                    </select>

                    {/* Search and Clear Buttons */}
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <span>🔎</span>
                        <span>Buscar</span>
                    </button>

                    <button
                        onClick={handleClearFilters}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Limpiar
                    </button>

                    {/* View Toggle Buttons */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📋 Tabla
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📱 Cuadrícula
                        </button>
                    </div>
                    
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setShowProductForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
                    >
                        <span>➕</span>
                        <span>Nuevo Producto</span>
                    </button>

                    <a
                        href="/categorias"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
                    >
                        <span>📁</span>
                        <span>Gestionar Categorías</span>
                    </a>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            disabled={exportLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>📤</span>
                            <span>Exportar</span>
                            <span className={`ml-1 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={exportLoading}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>📊</span>
                                    <span>Exportar a Excel (CSV)</span>
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    disabled={exportLoading}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>📄</span>
                                    <span>Exportar a PDF</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Product View - Main Content */}
                <div className="lg:col-span-3">
                    {viewMode === 'table' ? (
                        <ProductTable
                            productos={productos}
                            categorias={categorias}
                            loading={loading}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onRefresh={() => handleSearch()}
                            onBulkAdjust={handleBulkAdjust}
                        />
                    ) : (
                        <ProductosGrid
                            productos={productos}
                            categorias={categorias}
                            loading={loading}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                        />
                    )}
                </div>
            </div>

            {/* Product Form Modal */}
            <ProductForm
                isOpen={showProductForm}
                onClose={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                }}
                onSave={handleCreateProduct}
                categorias={categorias}
                editingProduct={editingProduct}
                loading={saving}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalProducts)} de {totalProducts} productos
                        </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        
                        <span className="px-3 py-1 text-sm text-gray-700">
                            Página {currentPage} de {totalPages}
                        </span>
                        
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
                    notification.type === 'success' 
                        ? 'bg-green-500 text-white' 
                        : notification.type === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                }`}>
                    <div className="flex items-center space-x-2">
                        <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
                        <span>{notification.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
