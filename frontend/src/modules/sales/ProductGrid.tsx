import { useState } from 'react';
import type { Producto, Categoria } from '../catalogue/types';

interface ProductGridProps {
    productos: Producto[];
    onAddToCart: (producto: Producto) => void;
    loading?: boolean;
    categorias?: Categoria[];
    inventoryMap?: Map<number, number>;
}

export default function ProductGrid({ 
    productos, 
    onAddToCart, 
    loading = false, 
    categorias = [], 
    inventoryMap = new Map()
}: ProductGridProps) {
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const sortedProducts = productos.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
            case 'name':
                aValue = a.nombre.toLowerCase();
                bValue = b.nombre.toLowerCase();
                break;
            case 'price':
                aValue = a.costo;
                bValue = b.costo;
                break;
            case 'stock':
                aValue = a.stock || 0;
                bValue = b.stock || 0;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getStockStatus = (stock: number) => {
        const currentStock = stock || 0;
        if (currentStock > 10) return { color: 'bg-green-100 text-green-800', label: 'Alto' };
        if (currentStock > 0) return { color: 'bg-yellow-100 text-yellow-800', label: 'Bajo' };
        return { color: 'bg-red-100 text-red-800', label: 'Sin stock' };
    };

    const getInventoryStock = (productoId: number) => {
        return inventoryMap.get(productoId) || 0;
    };

    const getCategoryName = (categoriaId?: number) => {
        if (!categoriaId) return '';
        const categoria = categorias.find(cat => cat.id === categoriaId);
        return categoria?.nombre || '';
    };

    const getImageSrc = (producto: Producto) => {
        // Handle different image formats
        if (producto.fotos && producto.fotos.length > 0) {
            const firstImage = producto.fotos[0];
            // If it's already a base64 data URL, use it directly
            if (firstImage.startsWith('data:image/')) {
                return firstImage;
            }
            // If it's just base64 data, prepend the data URL prefix
            if (firstImage.length > 100) { // Basic check for base64 data
                return `data:image/jpeg;base64,${firstImage}`;
            }
        }
        // Fallback to placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iI0Q5RDlEOSIvPgo8cGF0aCBkPSJNNjAgMTQwTDkwIDExMEwxMTAgMTMwTDE0MCA5MEwxNzAgMTIwVjE2MEg2MFYxNDBaIiBmaWxsPSIjRDlEOUQ5Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIj5TaW4gaW1hZ2VuPC90ZXh0Pgo8L3N2Zz4K';
    };

    const handleSort = (field: 'name' | 'price' | 'stock') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-300"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-300 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters and Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-gray-600">
                    Mostrando {sortedProducts.length} productos
                </div>

                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Ordenar por:</span>
                    <div className="flex space-x-2">
                        {[
                            { key: 'name', label: 'Nombre' },
                            { key: 'price', label: 'Precio' },
                            { key: 'stock', label: 'Stock' }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => handleSort(key as 'name' | 'price' | 'stock')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    sortBy === key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {label}
                                {sortBy === key && (
                                    <span className="ml-1">
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map(producto => {
                    const currentStock = getInventoryStock(producto.id);
                    const stockStatus = getStockStatus(currentStock);
                    const categoryName = getCategoryName(producto.categoria_id);
                    const imageSrc = getImageSrc(producto);

                    return (
                        <div
                            key={producto.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                        >
                            {/* Product Image */}
                            <div className="aspect-square bg-gray-100 relative overflow-hidden group">
                                <img
                                    src={imageSrc}
                                    alt={producto.nombre}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                
                                {/* Quick Actions Overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => onAddToCart(producto)}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-gray-100 transition-colors"
                                    >
                                        + Agregar al carrito
                                    </button>
                                </div>

                                {/* Stock Badge */}
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                    {stockStatus.label}: {currentStock}
                                </div>

                                {/* Category Badge */}
                                {categoryName && (
                                    <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        {categoryName}
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate" title={producto.nombre}>
                                    {producto.nombre}
                                </h3>

                                {producto.descripcion && (
                                    <p className="text-gray-600 text-sm mb-3 line-clamp-2" title={producto.descripcion}>
                                        {producto.descripcion}
                                    </p>
                                )}

                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-bold text-green-600">
                                        $ {producto.costo.toFixed(2)}
                                    </span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                                        Stock: {currentStock}
                                    </span>
                                </div>

                                {/* Tags */}
                                {producto.tags && producto.tags.split(' ').filter(t => t.trim()).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {producto.tags.split(' ').slice(0, 2).map((tag) => {
                                            const cleanTag = tag.trim();
                                            if (!cleanTag) return null;
                                            return (
                                                <span key={cleanTag} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    #{cleanTag}
                                                </span>
                                            );
                                        })}
                                        {producto.tags.split(' ').length > 2 && (
                                            <span className="text-xs text-gray-500">+{producto.tags.split(' ').length - 2} más</span>
                                        )}
                                    </div>
                                )}

                                {/* Add to Cart Button */}
                                <button
                                    onClick={() => onAddToCart(producto)}
                                    disabled={currentStock <= 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {currentStock <= 0 ? 'Sin stock' : `Agregar al carrito - $${producto.costo.toFixed(2)}`}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🛍️</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay productos disponibles</h3>
                    <p className="text-gray-600">No se encontraron productos en el inventario.</p>
                </div>
            )}
        </div>
    );
}