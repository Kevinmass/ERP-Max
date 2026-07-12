import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Producto, Categoria } from './types';
import PriceAdjustModal from './PriceAdjustModal';

interface ProductTableProps {
    productos: Producto[];
    categorias: Categoria[];
    loading: boolean;
    onEdit: (producto: Producto) => void;
    onDelete: (productoId: number) => void;
    onRefresh: () => void;
    onBulkAdjust: (productIds: number[], porcentaje: number) => Promise<void>;
}

export default function ProductTable({
    productos,
    categorias,
    loading,
    onEdit,
    onDelete,
    onRefresh,
    onBulkAdjust
}: ProductTableProps) {
    const [search, setSearch] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [sortBy, setSortBy] = useState<'none' | 'stock' | 'price'>('none');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [applying, setApplying] = useState(false);

    // Reset selection whenever the loaded product set changes (filter/search/view),
    // so the selection always matches what's currently shown.
    useEffect(() => {
        setSelectedIds(new Set());
    }, [productos]);

    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedSetSearch = useCallback((value: string) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            setSearch(value);
        }, 300);
    }, []);

    // Build category map for quick lookup
    const categoryMap = useMemo(() => {
        const map = new Map<number, Categoria>();
        categorias.forEach(cat => map.set(cat.id, cat));
        return map;
    }, [categorias]);

    // Get category display path (simplified - just parent > child for now)
    const getCategoryDisplay = (producto: Producto): string => {
        if (!producto.categoria_id) return 'Sin categoría';

        const category = categoryMap.get(producto.categoria_id);
        if (!category) return 'Sin categoría';

        let path = category.nombre;
        let parentId = category.categoria_padre_id;

        while (parentId) {
            const parent = categoryMap.get(parentId);
            if (parent) {
                path = `${parent.nombre} > ${path}`;
                parentId = parent.categoria_padre_id;
            } else {
                break;
            }
        }

        return path;
    };

    // Filter and sort products
    const filteredAndSortedProductos = useMemo(() => {
        let filtered = productos;

        // Apply search filter
        if (search.trim()) {
            const searchWords = search.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = productos.filter(producto => {
                const text = `${producto.nombre} ${producto.descripcion || ''} ${producto.tags || ''}`.toLowerCase();
                return searchWords.every(word => text.includes(word));
            });
        }

        // Apply sorting
        if (sortBy !== 'none') {
            filtered = [...filtered].sort((a, b) => {
                let aValue: number;
                let bValue: number;

                if (sortBy === 'stock') {
                    aValue = a.stock;
                    bValue = b.stock;
                } else { // price
                    aValue = a.costo;
                    bValue = b.costo;
                }

                if (sortOrder === 'asc') {
                    return aValue - bValue;
                } else {
                    return bValue - aValue;
                }
            });
        }

        return filtered;
    }, [productos, search, sortBy, sortOrder]);

    // Selection helpers (selection persists across filtering/sorting)
    const selectedProducts = useMemo(
        () => productos.filter(p => selectedIds.has(p.id)),
        [productos, selectedIds]
    );

    const allVisibleSelected = filteredAndSortedProductos.length > 0
        && filteredAndSortedProductos.every(p => selectedIds.has(p.id));

    const toggleOne = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAllVisible = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filteredAndSortedProductos.forEach(p => next.delete(p.id));
            } else {
                filteredAndSortedProductos.forEach(p => next.add(p.id));
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleApplyAdjust = async (porcentaje: number) => {
        try {
            setApplying(true);
            await onBulkAdjust(Array.from(selectedIds), porcentaje);
            setAdjustOpen(false);
            clearSelection();
        } catch {
            // parent surfaces the error; keep the modal open so the user can retry
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando productos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header with search and controls */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                debouncedSetSearch(e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'none' | 'stock' | 'price')}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="none">Sin ordenar</option>
                            <option value="stock">Por stock</option>
                            <option value="price">Por precio</option>
                        </select>

                        {sortBy !== 'none' && (
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        )}

                        <button
                            onClick={onRefresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk selection bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <span className="text-sm text-blue-800 font-medium">
                        {selectedIds.size} producto(s) seleccionados
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAdjustOpen(true)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Ajustar precios
                        </button>
                        <button
                            onClick={clearSelection}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleAllVisible}
                                    className="rounded border-gray-300"
                                    aria-label="Seleccionar todos"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Categoría
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Precio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Etiquetas
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedProductos.map((producto) => {
                            const categoryDisplay = getCategoryDisplay(producto);

                            return (
                                <tr key={producto.id} className={`transition-colors ${selectedIds.has(producto.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(producto.id)}
                                            onChange={() => toggleOne(producto.id)}
                                            className="rounded border-gray-300"
                                            aria-label={`Seleccionar ${producto.nombre}`}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {producto.nombre}
                                            </div>
                                            {producto.descripcion && (
                                                <div className="text-sm text-gray-500">
                                                    {producto.descripcion}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            📁 {categoryDisplay}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            producto.stock > 10
                                                ? 'bg-green-100 text-green-800'
                                                : producto.stock > 0
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                        }`}>
                                            {producto.stock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-green-600">
                                            $ {producto.costo.toFixed(2)}
                                        </div>
                                        {producto.precio_compra != null && producto.precio_compra > 0 && (() => {
                                            const markup = ((producto.costo - producto.precio_compra) / producto.precio_compra) * 100;
                                            const positive = producto.costo >= producto.precio_compra;
                                            return (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    Costo $ {producto.precio_compra.toFixed(2)} ·{' '}
                                                    <span className={positive ? 'text-green-600' : 'text-red-600'}>
                                                        {markup >= 0 ? '+' : ''}{markup.toFixed(0)}%
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {producto.tags && producto.tags.split(' ').filter(t => t.trim()).length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {producto.tags.split(' ').map((tag) => {
                                                    const cleanTag = tag.trim();
                                                    if (!cleanTag) return null;
                                                    return (
                                                        <span key={cleanTag} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                            #{cleanTag}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Sin etiquetas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {producto.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onEdit(producto)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => onDelete(producto.id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredAndSortedProductos.length === 0 && productos.length > 0 && (
                <div className="text-center py-20 text-gray-500 bg-white rounded-b-lg min-h-[300px] flex items-center justify-center">
                    No se encontraron productos que coincidan con "{search}"
                </div>
            )}

            {productos.length === 0 && (
                <div className="text-center py-20 text-gray-500 bg-white rounded-b-lg min-h-[300px] flex items-center justify-center">
                    No hay productos disponibles
                </div>
            )}

            <PriceAdjustModal
                isOpen={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                selectedProducts={selectedProducts}
                onApply={handleApplyAdjust}
                loading={applying}
            />
        </div>
    );
}
