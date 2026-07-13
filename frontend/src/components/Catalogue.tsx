import { useState, useEffect, useRef } from 'react';
import { Search, Folder, Boxes, Plus, Table2, LayoutGrid, Upload, FileSpreadsheet, FileDown, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import ProductTable from '../modules/catalogue/ProductTable';
import ProductosGrid from '../modules/catalogue/ProductosGrid';
import ProductForm from '../modules/catalogue/ProductForm';
import CategoryManager from '../modules/catalogue/CategoryManager';
import type { Producto, ProductoResponse, Categoria, CrearProducto, ActualizarProducto, CrearCategoria } from '../modules/catalogue/types';
import { sortCategoriesHierarchically, getCategoryBreadcrumb } from '../modules/catalogue/categoryTree';
import { exportCatalogueToExcel, exportCatalogueToPdf } from '../api/catalogue';
import { useToast } from '../context/ToastContext';

export default function Catalogue() {
    const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>(
        () => new URLSearchParams(window.location.search).get('tab') === 'categorias' ? 'categorias' : 'productos'
    );
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCategory, setSavingCategory] = useState(false);
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    // Prefilled from ?q= when arriving from the «Hoy» search field.
    const [searchQuery, setSearchQuery] = useState(
        () => new URLSearchParams(window.location.search).get('q') || ''
    );
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20); // Limit to 20 products per page
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Export state
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const { showToast } = useToast();

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
            showToast('Error al eliminar el producto', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEditProduct = (producto: Producto) => {
        setEditingProduct(producto);
        setShowProductForm(true);
    };

    const handleCreateCategory = async (categoria: CrearCategoria) => {
        try {
            setSavingCategory(true);
            await invoke<Categoria>('create_categoria', { categoria });
            await loadCategories();
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (categoriaId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría? Esta acción no se puede deshacer.\n\nLos productos que pertenezcan a esta categoría quedarán sin asignación de categoría.')) {
            return;
        }

        try {
            setSavingCategory(true);
            await invoke('delete_categoria', { categoriaId });
            await loadCategories();
            await handleSearch(); // product category badges may have changed
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast(`Error al eliminar la categoría: ${error}`, 'error');
        } finally {
            setSavingCategory(false);
        }
    };

    const handleBulkAdjust = async (productIds: number[], porcentaje: number, desdeCosto: boolean) => {
        try {
            setSaving(true);
            const actualizados = await invoke<number>('aplicar_ajuste_precios', { productIds, porcentaje, desdeCosto });
            await handleSearch(); // refresh with current filters
            showToast(`${actualizados} producto(s) actualizados`, 'success');
        } catch (error) {
            console.error('Error adjusting prices:', error);
            showToast('Error al ajustar los precios', 'error');
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
            showToast('Catálogo exportado a Excel exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            showToast('Error al exportar a Excel', 'error');
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            setExportLoading(true);
            setIsExportDropdownOpen(false);
            await exportCatalogueToPdf();
            showToast('Catálogo exportado a PDF exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            showToast('Error al exportar a PDF', 'error');
        } finally {
            setExportLoading(false);
        }
    };

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

                <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('productos')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                            activeTab === 'productos'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Boxes className="w-4 h-4" strokeWidth={1.5} /> Productos
                    </button>
                    <button
                        onClick={() => setActiveTab('categorias')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                            activeTab === 'categorias'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Folder className="w-4 h-4" strokeWidth={1.5} /> Categorías
                    </button>
                </div>
            </div>

            {activeTab === 'categorias' ? (
                <CategoryManager
                    categorias={categorias}
                    onCreateCategory={handleCreateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    loading={savingCategory}
                />
            ) : (
            <>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between lg:flex-nowrap">
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
                            <Search className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">Todas las categorías</option>
                        {sortCategoriesHierarchically(categorias).map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {getCategoryBreadcrumb(cat, categorias)}
                            </option>
                        ))}
                    </select>

                    {/* Search and Clear Buttons */}
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <Search className="w-4 h-4" strokeWidth={1.5} />
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
                            <span className="inline-flex items-center gap-1"><Table2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Tabla</span>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="inline-flex items-center gap-1"><LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} /> Cuadrícula</span>
                        </button>
                    </div>
                    
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setShowProductForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" strokeWidth={1.5} />
                        <span>Nuevo Producto</span>
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            disabled={exportLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload className="w-4 h-4" strokeWidth={1.5} />
                            <span>Exportar</span>
                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={exportLoading}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} />
                                    <span>Exportar a Excel (CSV)</span>
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    disabled={exportLoading}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileDown className="w-4 h-4" strokeWidth={1.5} />
                                    <span>Exportar a PDF</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination Controls (top) */}
            {totalPages > 1 && (
                <CataloguePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalProducts={totalProducts}
                    loading={loading}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 min-w-0">
                {/* Product View - Main Content */}
                <div className="lg:col-span-3 min-w-0">
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

            {/* Pagination Controls (bottom) */}
            {totalPages > 1 && (
                <CataloguePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalProducts={totalProducts}
                    loading={loading}
                    onPageChange={handlePageChange}
                />
            )}
            </>
            )}
        </div>
    );
}

function CataloguePagination({ currentPage, totalPages, pageSize, totalProducts, loading, onPageChange, className }: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalProducts: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg ${className ?? ''}`}>
            <span className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalProducts)} de {totalProducts} productos
            </span>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1 || loading}
                    className="p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Primera página"
                    aria-label="Primera página"
                >
                    <ChevronsLeft className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>

                <span className="px-3 py-1 text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Siguiente
                </button>

                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Última página"
                    aria-label="Última página"
                >
                    <ChevronsRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
}
