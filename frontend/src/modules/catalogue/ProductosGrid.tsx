import { useMemo } from 'react';
import { Package } from 'lucide-react';
import ProductoCard from './ProductoCard';
import type { Producto, Categoria } from './types';

interface ProductosGridProps {
    productos: Producto[];
    categorias: Categoria[];
    loading: boolean;
    onEdit: (producto: Producto) => void;
    onDelete: (productoId: number) => void;
}

export default function ProductosGrid({
    productos,
    categorias,
    loading,
    onEdit,
    onDelete
}: ProductosGridProps) {
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

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-200"></div>
                        <div className="p-4">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (productos.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-lg border border-gray-200 min-h-[300px] flex flex-col items-center justify-center">
                <Package className="w-14 h-14 mb-4 text-gray-400" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
                <p className="text-gray-500">Comienza agregando tu primer producto al catálogo.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map((producto) => {
                const categoriaNombre = getCategoryDisplay(producto);
                return (
                    <ProductoCard
                        key={producto.id}
                        producto={producto}
                        categoriaNombre={categoriaNombre}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                );
            })}
        </div>
    );
}
