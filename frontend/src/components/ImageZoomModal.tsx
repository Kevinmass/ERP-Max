import React, { useEffect, useRef } from 'react';

interface ImageZoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    currentIndex: number;
    onImageChange: (index: number) => void;
    productName: string;
}

export default function ImageZoomModal({
    isOpen,
    onClose,
    images,
    currentIndex,
    onImageChange,
    productName
}: ImageZoomModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextImage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevImage();
            }
        };

        const handleOutsideClick = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleOutsideClick);
        
        // Focus the close button for accessibility
        setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 100);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose, currentIndex, images.length]);

    const handleNextImage = () => {
        if (images.length > 1) {
            onImageChange((currentIndex + 1) % images.length);
        }
    };

    const handlePrevImage = () => {
        if (images.length > 1) {
            onImageChange((currentIndex - 1 + images.length) % images.length);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY > 0) {
            handleNextImage();
        } else {
            handlePrevImage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div 
                ref={modalRef}
                className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center"
                onWheel={handleWheel}
            >
                {/* Close Button */}
                <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    aria-label="Cerrar vista ampliada"
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        {/* Previous Arrow */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePrevImage();
                            }}
                            aria-label="Imagen anterior"
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-white cursor-pointer z-20"
                            style={{ pointerEvents: 'auto' }}
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Next Arrow */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNextImage();
                            }}
                            aria-label="Siguiente imagen"
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-white cursor-pointer z-20"
                            style={{ pointerEvents: 'auto' }}
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Image Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                    <img
                        src={images[currentIndex]}
                        alt={`${productName} - Imagen ${currentIndex + 1} de ${images.length}`}
                        className="max-w-full max-h-full object-contain cursor-zoom-out"
                        style={{ 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            msUserSelect: 'none'
                        }}
                        draggable="false"
                    />
                </div>

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}

                {/* Product Name */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm max-w-xs truncate">
                    {productName}
                </div>
            </div>
        </div>
    );
}