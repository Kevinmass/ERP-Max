import React, { useState, useEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Producto, Categoria, CrearProducto, ActualizarProducto } from './types';
import { sortCategoriesHierarchically, getCategoryBreadcrumb } from './categoryTree';

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (producto: CrearProducto | ActualizarProducto) => Promise<void>;
    categorias: Categoria[];
    editingProduct?: Producto | null;
    loading: boolean;
}

export default function ProductForm({
    isOpen,
    onClose,
    onSave,
    categorias,
    editingProduct,
    loading
}: ProductFormProps) {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        costo: 0,
        precio_compra: undefined as number | undefined,
        stock: 0,
        categoria_id: undefined as number | undefined,
        tags: '',
        fotos: [] as string[]
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const addImagesInputRef = useRef<HTMLInputElement>(null);
    const replaceImageInputRef = useRef<HTMLInputElement>(null);
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

    // Reset form when modal opens/closes or editing product changes
    useEffect(() => {
        if (isOpen) {
            if (editingProduct) {
                setFormData({
                    nombre: editingProduct.nombre,
                    descripcion: editingProduct.descripcion || '',
                    costo: editingProduct.costo,
                    precio_compra: editingProduct.precio_compra ?? undefined,
                    stock: editingProduct.stock,
                    categoria_id: editingProduct.categoria_id || undefined,
                    tags: editingProduct.tags || '',
                    fotos: editingProduct.fotos || []
                });
            } else {
                setFormData({
                    nombre: '',
                    descripcion: '',
                    costo: 0,
                    precio_compra: undefined,
                    stock: 0,
                    categoria_id: undefined,
                    tags: '',
                    fotos: []
                });
            }
            setErrors({});
        }
    }, [isOpen, editingProduct]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }

        if (formData.costo < 0) {
            newErrors.costo = 'El precio no puede ser negativo';
        }

        if (formData.stock < 0) {
            newErrors.stock = 'El stock no puede ser negativo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const productData = {
                ...formData,
                descripcion: formData.descripcion.trim() || undefined,
                tags: formData.tags.trim() || undefined,
                categoria_id: formData.categoria_id || undefined
            };

            if (editingProduct) {
                await onSave({
                    id: editingProduct.id,
                    ...productData
                } as ActualizarProducto);
            } else {
                await onSave(productData as CrearProducto);
            }

            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Convert files to base64 and append — never touches existing photos
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        fotos: [...prev.fotos, result]
                    }));
                }
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            fotos: prev.fotos.filter((_, i) => i !== index)
        }));
    };

    // Clicking a thumbnail opens the picker for just that slot; only that
    // image is swapped out, the rest of the gallery is untouched.
    const startReplaceImage = (index: number) => {
        setReplacingIndex(index);
        replaceImageInputRef.current?.click();
    };

    const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const index = replacingIndex;
        if (!file || index === null) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    fotos: prev.fotos.map((foto, i) => i === index ? result : foto)
                }));
            }
        };
        reader.readAsDataURL(file);

        e.target.value = '';
        setReplacingIndex(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Nombre del producto"
                            />
                            {errors.nombre && (
                                <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                            )}
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formData.descripcion}
                                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Descripción del producto"
                            />
                        </div>

                        {/* Precio de venta, Costo y Stock */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Precio de venta *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.costo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.costo ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="0.00"
                                />
                                {errors.costo && (
                                    <p className="text-red-500 text-sm mt-1">{errors.costo}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Costo <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.precio_compra ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            precio_compra: v === '' ? undefined : (parseFloat(v) || 0)
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="—"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stock
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.stock ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="0"
                                />
                                {errors.stock && (
                                    <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
                                )}
                            </div>
                        </div>

                        {/* Margen en vivo (solo si hay costo cargado) */}
                        {formData.precio_compra != null && formData.precio_compra > 0 && (() => {
                            const ganancia = formData.costo - formData.precio_compra;
                            const markup = (ganancia / formData.precio_compra) * 100;
                            const positive = ganancia >= 0;
                            return (
                                <p className={`text-sm -mt-2 ${positive ? 'text-green-600' : 'text-red-600'}`}>
                                    {positive ? 'Ganancia' : 'Pérdida'}: ${Math.abs(ganancia).toFixed(2)}{' '}
                                    ({markup.toFixed(1)}% sobre el costo)
                                </p>
                            );
                        })()}

                        {/* Categoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categoría
                            </label>
                            <select
                                value={formData.categoria_id || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    categoria_id: e.target.value ? parseInt(e.target.value) : undefined
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Sin categoría</option>
                                {sortCategoriesHierarchically(categorias).map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {getCategoryBreadcrumb(cat, categorias)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Etiquetas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Etiquetas
                            </label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="etiqueta1 etiqueta2 etiqueta3"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Separe las etiquetas con espacios
                            </p>
                        </div>

                        {/* Imágenes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Imágenes
                            </label>

                            {/* Hidden inputs: one for adding (multiple), one for replacing a single slot */}
                            <input
                                ref={addImagesInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <input
                                ref={replaceImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleReplaceImage}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => addImagesInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <ImagePlus className="w-4 h-4" strokeWidth={1.5} /> Agregar imágenes
                            </button>
                            <p className="text-sm text-gray-500 mt-1">
                                Se suman a las que ya tenga el producto. Haga clic sobre una imagen para reemplazarla.
                            </p>

                            {/* Preview images */}
                            {formData.fotos.length > 0 && (
                                <div className="mt-2 grid grid-cols-4 gap-2">
                                    {formData.fotos.map((foto, index) => (
                                        <div key={index} className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => startReplaceImage(index)}
                                                className="block w-full"
                                                title="Reemplazar esta imagen"
                                            >
                                                <img
                                                    src={foto}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-20 object-cover rounded border"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded transition-colors flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Reemplazar
                                                    </span>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear')}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
