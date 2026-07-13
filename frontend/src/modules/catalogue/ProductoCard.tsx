
import type { Producto } from './types';
import { useState, useEffect } from 'react';
import { Folder } from 'lucide-react';
import ImageZoomModal from '../../components/ImageZoomModal';

interface ProductoCardProps {
    producto: Producto;
    categoriaNombre?: string;
    onEdit: (producto: Producto) => void;
    onDelete: (productoId: number) => void;
}

// Inline SVG placeholder for products without images
const imagePlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iI0Q5RDlEOSIvPgo8cGF0aCBkPSJNNjAgMTQwTDkwIDExMEwxMTAgMTMwTDE0MCA5MEwxNzAgMTIwVjE2MEg2MFYxNDBaIiBmaWxsPSIjRDlEOUQ5Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIj5TaW4gaW1hZ2VuPC90ZXh0Pgo8L3N2Zz4K';

export default function ProductoCard({ producto, categoriaNombre, onEdit, onDelete }: ProductoCardProps) {
    // Carousel state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    // Zoom modal state
    const [isZoomOpen, setIsZoomOpen] = useState(false);

    // Get all valid images
    const getValidImages = () => {
        if (!producto.fotos || producto.fotos.length === 0) {
            return [imagePlaceholder];
        }

        return producto.fotos.map((imageData) => {
            if (imageData.startsWith('data:image/')) {
                return imageData;
            } else {
                return `data:image/jpeg;base64,${imageData}`;
            }
        });
    };

    const images = getValidImages();
    const hasMultipleImages = images.length > 1;

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle carousel navigation if zoom is open
            if (isZoomOpen) return;
            
            if (!isHovering || !hasMultipleImages) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextImage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovering, hasMultipleImages, isZoomOpen]);

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const currentImage = images[currentImageIndex];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Image */}
            <div 
                className="aspect-square bg-gray-100 relative overflow-hidden group"
                onMouseEnter={() => !isZoomOpen && setIsHovering(true)}
                onMouseLeave={() => !isZoomOpen && setIsHovering(false)}
            >
                <img
                    src={currentImage}
                    alt={`${producto.nombre} - Imagen ${currentImageIndex + 1} de ${images.length}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    onClick={() => setIsZoomOpen(true)}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite error loops by only setting fallback once
                        if (target.src !== imagePlaceholder) {
                            target.src = imagePlaceholder;
                        }
                    }}
                />
                
                {/* Navigation Arrows */}
                {hasMultipleImages && (
                    <>
                        {/* Previous Arrow */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePrevImage();
                            }}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all duration-200 transform ${
                                isHovering ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                            }`}
                            aria-label="Imagen anterior"
                            title="Imagen anterior (Flecha izquierda)"
                        >
                            ←
                        </button>
                        
                        {/* Next Arrow */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNextImage();
                            }}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all duration-200 transform ${
                                isHovering ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                            }`}
                            aria-label="Siguiente imagen"
                            title="Siguiente imagen (Flecha derecha)"
                        >
                            →
                        </button>
                        
                        {/* Image Counter */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate" title={producto.nombre}>
                    {producto.nombre}
                </h3>

                {producto.descripcion && (
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2" title={producto.descripcion}>
                        {producto.descripcion}
                    </p>
                )}

                {categoriaNombre && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                        <Folder className="w-3 h-3" strokeWidth={1.5} /> {categoriaNombre}
                    </span>
                )}

                <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-green-600">
                        $ {producto.costo.toFixed(2)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        producto.stock > 10
                            ? 'bg-green-100 text-green-800'
                            : producto.stock > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                    }`}>
                        Stock: {producto.stock}
                    </span>
                </div>

                {producto.precio_compra != null && producto.precio_compra > 0 && (() => {
                    const markup = ((producto.costo - producto.precio_compra) / producto.precio_compra) * 100;
                    const positive = producto.costo >= producto.precio_compra;
                    return (
                        <div className="text-xs text-gray-400 mb-3 -mt-1">
                            Costo $ {producto.precio_compra.toFixed(2)} ·{' '}
                            <span className={positive ? 'text-green-600' : 'text-red-600'}>
                                {markup >= 0 ? '+' : ''}{markup.toFixed(0)}% margen
                            </span>
                        </div>
                    );
                })()}

                {producto.tags && producto.tags.split(' ').filter(t => t.trim()).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {producto.tags.split(' ').slice(0, 3).map((tag) => {
                            const cleanTag = tag.trim();
                            if (!cleanTag) return null;
                            return (
                                <span key={cleanTag} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                    #{cleanTag}
                                </span>
                            );
                        })}
                        {producto.tags.split(' ').length > 3 && (
                            <span className="text-xs text-gray-500">+{producto.tags.split(' ').length - 3} más</span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">ID: {producto.id}</span>
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
                </div>
            </div>

            {/* Image Zoom Modal */}
            <ImageZoomModal
                isOpen={isZoomOpen}
                onClose={() => setIsZoomOpen(false)}
                images={images}
                currentIndex={currentImageIndex}
                onImageChange={setCurrentImageIndex}
                productName={producto.nombre}
            />
        </div>
    );
}
