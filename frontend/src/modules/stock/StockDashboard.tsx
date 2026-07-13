import { useState, useEffect, useMemo } from 'react';
import { Package, RefreshCw, CheckCircle2, AlertTriangle, Hash, Search, ImageOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { InventoryItem, InventoryResponse, UpdateStockRequest } from './types';
import type { Categoria } from '../catalogue/types';
import { sortCategoriesHierarchically, getCategoryBreadcrumb, getDescendantCategoryIds } from '../catalogue/categoryTree';
import { useToast } from '../../context/ToastContext';

export default function StockDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editQuantity, setEditQuantity] = useState<number>(0);
    const [filter, setFilter] = useState<'all' | 'low' | 'normal'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkQuantity, setBulkQuantity] = useState<number>(0);
    const [applyingBulk, setApplyingBulk] = useState(false);
    const { showToast } = useToast();

    // Load inventory data
    useEffect(() => {
        loadInventory();
        loadCategorias();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const response = await invoke<InventoryResponse>('get_inventory_list');
            setInventory(response.data);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategorias = async () => {
        try {
            const data = await invoke<Categoria[]>('get_categorias');
            setCategorias(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleEditStock = (item: InventoryItem) => {
        setEditingId(item.product_id);
        setEditQuantity(item.quantity);
    };

    const handleSaveStock = async (productId: number) => {
        try {
            setSaving(true);
            const request: UpdateStockRequest = {
                product_id: productId,
                quantity: editQuantity
            };
            await invoke('update_stock_manually', { request });
            await loadInventory(); // Refresh data
            setEditingId(null);
        } catch (error) {
            console.error('Error updating stock:', error);
            showToast('Error al actualizar el stock', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditQuantity(0);
    };

    const handleMigrateStock = async () => {
        try {
            setMigrating(true);
            await invoke('migrate_product_stock_to_inventory');
            await loadInventory();
            showToast('Stock migrado exitosamente desde los productos al inventario', 'success');
        } catch (error) {
            console.error('Error migrating stock:', error);
            showToast('Error al migrar el stock', 'error');
        } finally {
            setMigrating(false);
        }
    };

    // Descendant ids of the selected category, so picking a parent also
    // matches its subcategories (mirrors Catálogo's filter, done client-side
    // here since the whole inventory list is already loaded at once).
    const categoryDescendantIds = useMemo(
        () => selectedCategory !== null ? getDescendantCategoryIds(selectedCategory, categorias) : null,
        [selectedCategory, categorias]
    );

    // Filter inventory based on selected filter, category and search text
    const filteredInventory = inventory.filter(item => {
        if (filter === 'low' && !item.is_low_stock) return false;
        if (filter === 'normal' && item.is_low_stock) return false;
        if (categoryDescendantIds && (item.categoria_id == null || !categoryDescendantIds.has(item.categoria_id))) return false;
        if (searchQuery.trim() && !item.product_name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
        return true;
    });

    // Selection helpers
    const allVisibleSelected = filteredInventory.length > 0
        && filteredInventory.every(item => selectedIds.has(item.product_id));

    const toggleOne = (productId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId); else next.add(productId);
            return next;
        });
    };

    const toggleAllVisible = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filteredInventory.forEach(item => next.delete(item.product_id));
            } else {
                filteredInventory.forEach(item => next.add(item.product_id));
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkUpdate = async () => {
        try {
            setApplyingBulk(true);
            await Promise.all(
                Array.from(selectedIds).map(productId => {
                    const request: UpdateStockRequest = { product_id: productId, quantity: bulkQuantity };
                    return invoke('update_stock_manually', { request });
                })
            );
            await loadInventory();
            showToast(`Stock actualizado en ${selectedIds.size} producto(s)`, 'success');
        } catch (error) {
            console.error('Error updating stock in bulk:', error);
            showToast('Error al actualizar el stock en lote', 'error');
        } finally {
            setApplyingBulk(false);
        }
    };

    // Calculate statistics
    const stats = {
        total: inventory.length,
        lowStock: inventory.filter(item => item.is_low_stock).length,
        normalStock: inventory.filter(item => !item.is_low_stock).length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0)
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando inventario...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Module Actions Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
                    <p className="text-gray-600 mt-1">
                        Controla y monitorea tu stock en tiempo real
                    </p>
                </div>
                
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleMigrateStock}
                        disabled={migrating || saving}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                    >
                        <Package className="w-4 h-4" strokeWidth={1.5} />
                        <span>{migrating ? 'Migrando...' : 'Migrar Stock'}</span>
                    </button>
                    <button
                        onClick={loadInventory}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                    >
                        <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Productos</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Package className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Stock Normal</p>
                            <p className="text-2xl font-bold text-green-600">{stats.normalStock}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-orange-600" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Unidades Totales</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.totalQuantity}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <Hash className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Actions */}
            <div className="flex flex-col gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                        </div>

                        {/* Category filter */}
                        <select
                            value={selectedCategory ?? ''}
                            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : null)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Todas las categorías</option>
                            {sortCategoriesHierarchically(categorias).map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {getCategoryBreadcrumb(cat, categorias)}
                                </option>
                            ))}
                        </select>

                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    filter === 'all'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('low')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    filter === 'low'
                                        ? 'bg-white text-orange-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Stock Bajo
                            </button>
                            <button
                                onClick={() => setFilter('normal')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    filter === 'normal'
                                        ? 'bg-white text-green-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Normal
                            </button>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        Mostrando {filteredInventory.length} de {inventory.length} productos
                    </div>
                </div>

                {/* Bulk selection bar */}
                {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                        <span className="text-sm font-medium text-blue-800">
                            {selectedIds.size} producto(s) seleccionados
                        </span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                value={bulkQuantity}
                                onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                disabled={applyingBulk}
                            />
                            <span className="text-xs text-gray-500">unidades</span>
                            <button
                                onClick={handleBulkUpdate}
                                disabled={applyingBulk}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {applyingBulk ? 'Aplicando...' : 'Establecer stock'}
                            </button>
                            <button
                                onClick={clearSelection}
                                disabled={applyingBulk}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory Table */}
            <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Lista de Inventario</h2>
                </div>
                
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
                                <th className="px-4 py-3 w-14"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Producto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stock Actual
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stock Mínimo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInventory.map((item) => (
                                <tr
                                    key={item.product_id}
                                    className={`group ${selectedIds.has(item.product_id) ? 'bg-blue-50' : item.is_low_stock ? 'bg-red-50' : ''} hover:bg-gray-50 transition-colors`}
                                >
                                    <td className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.product_id)}
                                            onChange={() => toggleOne(item.product_id)}
                                            className="rounded border-gray-300"
                                            aria-label={`Seleccionar ${item.product_name}`}
                                        />
                                    </td>
                                    <td className="px-4 py-4 w-14">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.product_name}
                                                className="w-10 h-10 object-cover rounded border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-300">
                                                <ImageOff className="w-4 h-4" strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.product_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingId === item.product_id ? (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={editQuantity}
                                                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={saving}
                                                />
                                                <span className="text-xs text-gray-500">unidades</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <span>{item.quantity}</span>
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full ${
                                                            item.quantity < item.min_stock_level 
                                                                ? 'bg-red-500' 
                                                                : item.quantity < item.min_stock_level * 2 
                                                                    ? 'bg-yellow-500' 
                                                                    : 'bg-green-500'
                                                        }`}
                                                        style={{ 
                                                            width: `${Math.min((item.quantity / (item.min_stock_level * 3)) * 100, 100)}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.min_stock_level}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.is_low_stock
                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                : 'bg-green-100 text-green-800 border border-green-200'
                                        }`}>
                                            {item.is_low_stock
                                                ? <><AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> Stock Bajo</>
                                                : <><CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> Normal</>}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {editingId === item.product_id ? (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleSaveStock(item.product_id)}
                                                    disabled={saving}
                                                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={saving}
                                                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEditStock(item)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredInventory.length === 0 && (
                    filter !== 'all' ? (
                        <div className="text-center py-8 text-gray-500">
                            {filter === 'low'
                                ? 'No hay productos con stock bajo'
                                : 'No hay productos con stock normal'}
                        </div>
                    ) : (
                        <div className="text-center py-16 flex flex-col items-center">
                            <Package className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                            <p className="text-gray-600 mb-4">Todavía no hay productos en el inventario.</p>
                            <button
                                onClick={handleMigrateStock}
                                disabled={migrating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {migrating ? 'Migrando...' : 'Migrar stock desde productos'}
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
