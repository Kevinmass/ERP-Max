import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import CategoryManager from '../modules/catalogue/CategoryManager';
import type { Categoria, CrearCategoria } from '../modules/catalogue/types';

export default function Categories() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [saving, setSaving] = useState(false);

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const categoriasResponse = await invoke<Categoria[]>('get_categorias');
            setCategorias(categoriasResponse);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleCreateCategory = async (categoria: CrearCategoria) => {
        try {
            setSaving(true);
            await invoke<Categoria>('create_categoria', { categoria });
            await loadData(); // Refresh data
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (categoriaId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría? Esta acción no se puede deshacer.\n\nLos productos que pertenezcan a esta categoría quedarán sin asignación de categoría.')) {
            return;
        }

        try {
            setSaving(true);
            await invoke('delete_categoria', { categoriaId });
            await loadData(); // Refresh data
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(`Error al eliminar la categoría: ${error}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h1>
                    <p className="text-gray-600 mt-1">
                        Organiza tu catálogo creando y gestionando categorías y subcategorías
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {categorias.length} categorías
                    </span>
                </div>
            </div>

            {/* Category Manager */}
            <div className="bg-white rounded-lg shadow-sm border">
                <CategoryManager
                    categorias={categorias}
                    onCreateCategory={handleCreateCategory}
                    loading={saving}
                    onDeleteCategory={handleDeleteCategory}
                />
            </div>
        </div>
    );
}