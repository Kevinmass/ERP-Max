import { useState, useEffect } from 'react';
import { ShoppingCart, X, ChevronRight, Minus, Plus, AlertTriangle } from 'lucide-react';
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
            flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${isCollapsed ? 'translate-x-full' : 'translate-x-0'}
        `}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-700 text-white shrink-0">
                <div className="flex items-center space-x-3">
                    <ShoppingCart className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                    <div>
                        <h3 className="font-semibold">Carrito</h3>
                        <p className="text-xs opacity-80 tabular-nums">{getItemCount()} ítems</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title={isCollapsed ? "Mostrar carrito" : "Ocultar carrito"}
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={onToggleVisibility}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Cerrar carrito"
                    >
                        <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Cart Content — ledger */}
            <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-400" strokeWidth={1.5} />
                        <p>El carrito está vacío</p>
                        <p className="text-sm mt-1">Escribí en la búsqueda y presioná Enter para agregar</p>
                    </div>
                ) : (
                    <>
                        {/* Ledger header row */}
                        <div className="grid grid-cols-[1fr,auto,auto] gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 sticky top-0 bg-white">
                            <span>Producto</span>
                            <span className="text-center">Cant.</span>
                            <span className="text-right">Subtotal</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {cart.map(item => {
                                const unitPrice = item.costo_modificado || item.costo;
                                const oversold = item.cantidad > item.stock;
                                return (
                                    <div key={item.producto_id} className="px-4 py-3">
                                        <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center">
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 truncate">{item.nombre}</div>
                                                <div className="text-xs text-gray-500 tabular-nums">
                                                    ${unitPrice.toFixed(2)} c/u
                                                    {item.costo_modificado && <span className="text-green-600"> · modificado</span>}
                                                </div>
                                                {oversold && (
                                                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                                                        <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                                                        Sin stock suficiente ({item.stock} disp.)
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.producto_id, item.cantidad - 1)}
                                                    disabled={item.cantidad <= 1}
                                                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" strokeWidth={2} />
                                                </button>
                                                <span className="w-6 text-center font-medium tabular-nums">{item.cantidad}</span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.producto_id, item.cantidad + 1)}
                                                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
                                                    title={item.cantidad >= item.stock ? 'Supera el stock disponible' : undefined}
                                                >
                                                    <Plus className="w-3 h-3" strokeWidth={2} />
                                                </button>
                                            </div>

                                            <div className="text-right font-medium text-gray-900 tabular-nums">
                                                ${(unitPrice * item.cantidad).toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Price override + remove */}
                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Modificar precio"
                                                defaultValue={item.costo_modificado || ""}
                                                onBlur={(e) => {
                                                    const value = parseFloat(e.target.value);
                                                    if (!isNaN(value) && value > 0) {
                                                        onUpdatePrice(item.producto_id, value);
                                                    } else if (e.target.value === "") {
                                                        onUpdatePrice(item.producto_id, 0);
                                                    }
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => onUpdateQuantity(item.producto_id, 0)}
                                                className="text-red-600 hover:text-red-800 text-xs font-medium shrink-0"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Customer Information Form */}
            <div className="border-t border-gray-200 p-4 bg-white shrink-0 max-h-64 overflow-y-auto">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Información del Cliente</h4>

                <div className="space-y-2">
                    <input
                        type="text"
                        value={customerData.nombre}
                        onChange={(e) => setCustomerData({...customerData, nombre: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre del cliente"
                    />
                    <input
                        type="text"
                        value={customerData.domicilio}
                        onChange={(e) => setCustomerData({...customerData, domicilio: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dirección"
                    />
                    <input
                        type="text"
                        value={customerData.localidad}
                        onChange={(e) => setCustomerData({...customerData, localidad: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Localidad"
                    />
                    <input
                        type="tel"
                        value={customerData.telefono}
                        onChange={(e) => setCustomerData({...customerData, telefono: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Teléfono de contacto"
                    />
                    <input
                        type="date"
                        value={customerData.fecha_entrega}
                        onChange={(e) => setCustomerData({...customerData, fecha_entrega: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                        value={customerData.observaciones}
                        onChange={(e) => setCustomerData({...customerData, observaciones: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Observaciones adicionales"
                        rows={2}
                    />
                </div>
            </div>

            {/* Running total — bottom-anchored, the number is the interface */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 shrink-0">
                <div className="flex items-end justify-between mb-4">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-3xl font-bold text-green-600 tabular-nums leading-none">
                        ${getTotal().toFixed(2)}
                    </span>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <span>Cobrar</span>
                                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-green-700 rounded">F12</kbd>
                            </>
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
