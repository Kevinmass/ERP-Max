import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { InventoryItem, InventoryResponse, UpdateStockRequest } from './types';

export default function StockDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editQuantity, setEditQuantity] = useState<number>(0);
    const [filter, setFilter] = useState<'all' | 'low' | 'normal'>('all');

    // Load inventory data
    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const response = await invoke<InventoryResponse>('get_inventory_list');
            setInventory(response.data);
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setLoading(false);
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
            alert('Error al actualizar el stock');
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
            alert('Stock migrado exitosamente desde los productos al inventario');
        } catch (error) {
            console.error('Error migrating stock:', error);
            alert('Error al migrar el stock');
        } finally {
            setMigrating(false);
        }
    };

    // Filter inventory based on selected filter
    const filteredInventory = inventory.filter(item => {
        if (filter === 'low') return item.is_low_stock;
        if (filter === 'normal') return !item.is_low_stock;
        return true; // 'all'
    });

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
                        <span>📦</span>
                        <span>{migrating ? 'Migrando...' : 'Migrar Stock'}</span>
                    </button>
                    <button
                        onClick={loadInventory}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                    >
                        <span>🔄</span>
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
                            <span className="text-blue-600 text-lg">📦</span>
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
                            <span className="text-green-600 text-lg">✅</span>
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
                            <span className="text-orange-600 text-lg">⚠️</span>
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
                            <span className="text-purple-600 text-lg">🔢</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Actions */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
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

            {/* Inventory Table */}
            <div className="bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Lista de Inventario</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
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
                                    className={`${item.is_low_stock ? 'bg-red-50' : ''} hover:bg-gray-50 transition-colors`}
                                >
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
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.is_low_stock
                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                : 'bg-green-100 text-green-800 border border-green-200'
                                        }`}>
                                            {item.is_low_stock ? '⚠️ Stock Bajo' : '✅ Normal'}
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
                                                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                    <div className="text-center py-8 text-gray-500">
                        {filter === 'low' 
                            ? 'No hay productos con stock bajo' 
                            : filter === 'normal'
                                ? 'No hay productos con stock normal'
                                : 'No hay productos en el inventario'
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
