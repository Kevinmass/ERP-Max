import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, Plus, Trash2 } from 'lucide-react';
import type { Categoria, CrearCategoria } from './types';

interface CategoryManagerProps {
    categorias: Categoria[];
    onCreateCategory: (categoria: CrearCategoria) => Promise<void>;
    onDeleteCategory?: (categoriaId: number) => Promise<void>;
    loading: boolean;
}

interface CategoryFormData {
    nombre: string;
    descripcion: string;
    categoria_padre_id?: number;
}


export default function CategoryManager({ categorias, onCreateCategory, onDeleteCategory, loading }: CategoryManagerProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
    const [formData, setFormData] = useState<CategoryFormData>({
        nombre: '',
        descripcion: '',
        categoria_padre_id: undefined
    });

    // Define tree node type
    type CategoryNode = Categoria & { children: CategoryNode[] };

    // Build hierarchical structure
    const buildCategoryTree = (categories: Categoria[]): CategoryNode[] => {
        const categoryMap = new Map<number, CategoryNode>();
        const roots: CategoryNode[] = [];

        // Initialize all categories
        categories.forEach(cat => {
            categoryMap.set(cat.id, { ...cat, children: [] });
        });

        // Build tree
        categories.forEach(cat => {
            const category = categoryMap.get(cat.id)!;
            if (cat.categoria_padre_id) {
                const parent = categoryMap.get(cat.categoria_padre_id);
                if (parent) {
                    parent.children.push(category);
                } else {
                    roots.push(category);
                }
            } else {
                roots.push(category);
            }
        });

        return roots;
    };

    const categoryTree = buildCategoryTree(categorias);

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return;

        try {
            await onCreateCategory({
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion.trim() || undefined,
                categoria_padre_id: formData.categoria_padre_id
            });
            setFormData({ nombre: '', descripcion: '', categoria_padre_id: undefined });
            setShowCreateForm(false);
        } catch (error) {
            console.error('Error creating category:', error);
        }
    };

    const toggleCategoryExpansion = (categoryId: number) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const startCreating = (parentId?: number) => {
        setShowCreateForm(true);
        setFormData({
            nombre: '',
            descripcion: '',
            categoria_padre_id: parentId
        });
    };

    const renderCategoryItem = (category: CategoryNode, level: number = 0) => {
        const isExpanded = expandedCategories.has(category.id);
        const hasChildren = category.children && category.children.length > 0;

        return (
            <div key={category.id} className="select-none">
                {/* Visual connector line for nested levels */}
                {level > 0 && (
                    <div className="ml-4 border-l-2 border-gray-200" style={{ height: '16px' }}></div>
                )}
                
                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors" style={{ paddingLeft: `${level * 16 + 8}px` }}>
                    <div className="flex items-center flex-1">
                        {/* Indentation guide line for parent categories */}
                        {level > 0 && (
                            <div className="w-4 h-px bg-gray-200 mr-2"></div>
                        )}
                        
                        {hasChildren && (
                            <button
                                onClick={() => toggleCategoryExpansion(category.id)}
                                className="mr-2 w-5 h-5 shrink-0 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                title={isExpanded ? 'Contraer' : 'Expandir'}
                                aria-label={isExpanded ? 'Contraer categoría' : 'Expandir categoría'}
                            >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
                            </button>
                        )}
                        {!hasChildren && <div className="w-5 mr-2" />}

                        <div className="flex-1">
                            <span className="text-gray-700 font-medium inline-flex items-center gap-1.5">
                                {level > 0 ? <FileText className="w-4 h-4" strokeWidth={1.5} /> : <Folder className="w-4 h-4" strokeWidth={1.5} />}
                                {category.nombre}
                            </span>
                            {category.descripcion && (
                                <span className="text-gray-500 text-sm ml-2">- {category.descripcion}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => startCreating(category.id)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Crear subcategoría"
                        >
                            <Plus className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        {onDeleteCategory && (
                            <button
                                onClick={() => onDeleteCategory(category.id)}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="Eliminar categoría"
                            >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="border-l-2 border-gray-100 ml-6 pl-2">
                        {category.children.map(child => renderCategoryItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Categorías</h2>
                    <button
                        onClick={() => startCreating()}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                        Nueva Categoría
                    </button>
                </div>

                {categorias.length === 0 ? (
                    <div className="text-center py-8">
                        <Folder className="w-10 h-10 mx-auto mb-4 text-gray-400" strokeWidth={1.5} />
                        <p className="text-gray-600">No hay categorías creadas</p>
                        <button
                            onClick={() => startCreating()}
                            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                            Crear primera categoría
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {categoryTree.map(category => renderCategoryItem(category))}
                    </div>
                )}
            </div>

            {/* Formulario para crear categoría */}
            {showCreateForm && (
                <div className="p-4 border-t bg-gray-50">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                        Nueva Categoría
                    </h3>

                    <form onSubmit={handleCreateCategory}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Nombre de la categoría"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Descripción opcional"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Categoría Padre
                                </label>
                                <select
                                    value={formData.categoria_padre_id || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        categoria_padre_id: e.target.value ? parseInt(e.target.value) : undefined
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    <option value="">Sin categoría padre</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Creando...' : 'Crear'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setFormData({ nombre: '', descripcion: '', categoria_padre_id: undefined });
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
