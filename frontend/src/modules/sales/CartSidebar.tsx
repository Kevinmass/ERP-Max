import { useState, useEffect } from 'react';
import { CartItem } from './types';

interface CartSidebarProps {
    cart: CartItem[];
    onUpdateQuantity: (producto_id: number, cantidad: number) => void;
    onUpdatePrice: (producto_id: number, precio_modificado: number) => void;
    onCheckout: (customerData: {
        nombre?: string;
        domicilio?: string;
        localidad?: string;
        telefono?: string;
        fecha_entrega?: string;
        observaciones?: string;
    }) => void;
    onClearCart: () => void;
    isVisible: boolean;
    onToggleVisibility: () => void;
    isLoading: boolean;
}

export default function CartSidebar({
    cart,
    onUpdateQuantity,
    onUpdatePrice,
    onCheckout,
    onClearCart,
    isVisible,
    onToggleVisibility,
    isLoading
}: CartSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [customerData, setCustomerData] = useState({
        nombre: '',
        domicilio: '',
        localidad: '',
        telefono: '',
        fecha_entrega: '',
        observaciones: ''
    });

    // Handle visibility changes
    useEffect(() => {
        if (isVisible) {
            setIsCollapsed(false);
        }
    }, [isVisible]);

    const getTotal = () => {
        return cart.reduce((total, item) => {
            const itemPrice = item.costo_modificado || item.costo;
            return total + (itemPrice * item.cantidad);
        }, 0);
    };

    const getItemCount = () => {
        return cart.reduce((count, item) => count + item.cantidad, 0);
    };

    const handleCheckout = () => {
        onCheckout(customerData);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className={`
            fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50
            transform transition-transform duration-300 ease-in-out
            ${isCollapsed ? 'translate-x-full' : 'translate-x-0'}
        `}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold">🛒</span>
                    </div>
                    <div>
                        <h3 className="font-semibold">Carrito de Compras</h3>
                        <p className="text-xs opacity-80">{getItemCount()} ítems</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        title={isCollapsed ? "Mostrar carrito" : "Ocultar carrito"}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={isCollapsed ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                        </svg>
                    </button>
                    <button
                        onClick={onToggleVisibility}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        title="Cerrar carrito"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <div className="text-4xl mb-2">🛒</div>
                        <p>El carrito está vacío</p>
                        <p className="text-sm mt-1">Agrega productos para comenzar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {cart.map(item => (
                            <div key={item.producto_id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 truncate">{item.nombre}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-600">Precio base:</span>
                                                <span className="text-sm font-medium">${item.costo.toFixed(2)}</span>
                                                {item.costo_modificado && (
                                                    <span className="text-xs text-green-600 font-medium">
                                                        Modificado: ${item.costo_modificado.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">Stock: {item.stock}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-blue-600 font-medium">
                                                Subtotal: ${((item.costo_modificado || item.costo) * item.cantidad).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => onUpdateQuantity(item.producto_id, item.cantidad - 1)}
                                            disabled={item.cantidad <= 1}
                                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <span className="text-sm">−</span>
                                        </button>
                                        
                                        <span className="w-12 text-center font-medium">{item.cantidad}</span>
                                        
                                        <button
                                            onClick={() => onUpdateQuantity(item.producto_id, item.cantidad + 1)}
                                            disabled={item.cantidad >= item.stock}
                                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <span className="text-sm">+</span>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Price Modification Controls */}
                                <div className="mt-3 flex items-center justify-between space-x-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Precio modificado</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Precio base"
                                                defaultValue={item.costo_modificado || ""}
                                                onBlur={(e) => {
                                                    const value = parseFloat(e.target.value);
                                                    if (!isNaN(value) && value > 0) {
                                                        onUpdatePrice(item.producto_id, value);
                                                    } else if (e.target.value === "") {
                                                        onUpdatePrice(item.producto_id, 0); // Reset to base price
                                                    }
                                                }}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            {item.costo_modificado && (
                                                <button
                                                    onClick={() => onUpdatePrice(item.producto_id, 0)}
                                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs rounded-md transition-colors"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onUpdateQuantity(item.producto_id, 0)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Customer Information Form */}
            <div className="border-t border-gray-200 p-4 bg-white">
                <h4 className="font-semibold text-gray-900 mb-3">Información del Cliente</h4>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                        <input
                            type="text"
                            value={customerData.nombre}
                            onChange={(e) => setCustomerData({...customerData, nombre: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre del cliente"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Dirección</label>
                        <input
                            type="text"
                            value={customerData.domicilio}
                            onChange={(e) => setCustomerData({...customerData, domicilio: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Dirección"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Localidad</label>
                        <input
                            type="text"
                            value={customerData.localidad}
                            onChange={(e) => setCustomerData({...customerData, localidad: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Localidad"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                        <input
                            type="tel"
                            value={customerData.telefono}
                            onChange={(e) => setCustomerData({...customerData, telefono: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Teléfono de contacto"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Fecha de Entrega</label>
                        <input
                            type="date"
                            value={customerData.fecha_entrega}
                            onChange={(e) => setCustomerData({...customerData, fecha_entrega: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Observaciones</label>
                        <textarea
                            value={customerData.observaciones}
                            onChange={(e) => setCustomerData({...customerData, observaciones: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Observaciones adicionales"
                            rows={2}
                        />
                    </div>
                </div>
            </div>

            {/* Cart Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Total ítems:</span>
                    <span className="font-medium">{getItemCount()}</span>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-2xl font-bold text-green-600">
                        ${getTotal().toFixed(2)}
                    </span>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Procesando...</span>
                            </div>
                        ) : (
                            `Checkout (${cart.length} ítems)`
                        )}
                    </button>
                    
                    {cart.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Limpiar Carrito
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}