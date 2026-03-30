import { useState } from 'react';
import { CartItem } from './types';

interface FloatingCheckoutButtonProps {
    cart: CartItem[];
    onCheckout: (customerData: {
        nombre?: string;
        domicilio?: string;
        localidad?: string;
        telefono?: string;
        fecha_entrega?: string;
        observaciones?: string;
    }) => void;
    onToggleCart: () => void;
    isLoading: boolean;
}

export default function FloatingCheckoutButton({
    cart,
    onCheckout,
    onToggleCart,
    isLoading
}: FloatingCheckoutButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showCheckoutForm, setShowCheckoutForm] = useState(false);
    const [customerData, setCustomerData] = useState({
        nombre: '',
        domicilio: '',
        localidad: '',
        telefono: '',
        fecha_entrega: '',
        observaciones: ''
    });

    const getTotal = () => {
        return cart.reduce((total, item) => {
            const itemPrice = item.costo_modificado || item.costo;
            return total + (itemPrice * item.cantidad);
        }, 0);
    };

    const getItemCount = () => {
        return cart.reduce((count, item) => count + item.cantidad, 0);
    };

    const totalItems = getItemCount();
    const totalPrice = getTotal();

    const handleCheckout = () => {
        if (cart.length === 0) {
            onToggleCart();
            return;
        }
        onCheckout(customerData);
        setShowCheckoutForm(false);
    };

    const handleQuickCheckout = () => {
        if (cart.length === 0) {
            onToggleCart();
            return;
        }
        // Quick checkout with minimal customer info
        onCheckout({
            nombre: customerData.nombre || undefined,
            observaciones: customerData.observaciones || undefined
        });
    };

    return (
        <>
            {/* Floating Checkout Button - Always accessible regardless of font size */}
            <div className={`
                fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out
                opacity-100 scale-100
            `}>
                <div className="flex flex-col space-y-3">
                    {/* Quick Checkout Button */}
                    <button
                        onClick={handleQuickCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className={`
                            bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-full shadow-lg
                            hover:from-green-700 hover:to-green-800 transform transition-all duration-300
                            hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300
                            disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:opacity-50
                            ${isHovered ? 'ring-4 ring-green-300' : ''}
                        `}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        aria-label={`Checkout rápido: $${totalPrice.toFixed(2)}`}
                    >
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl">💳</span>
                            <div className="text-right">
                                <div className="text-xs font-medium">Checkout</div>
                                <div className="text-xs font-bold">${totalPrice.toFixed(2)}</div>
                            </div>
                        </div>
                    </button>

                    {/* Toggle Cart Button */}
                    <button
                        onClick={onToggleCart}
                        className={`
                            bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-full shadow-lg
                            hover:from-blue-700 hover:to-blue-800 transform transition-all duration-300
                            hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
                        `}
                        aria-label={`Carrito: ${totalItems} ítems`}
                    >
                        <div className="flex items-center space-x-2">
                            <span className="text-xl">🛒</span>
                            {totalItems > 0 && (
                                <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {totalItems}
                                </div>
                            )}
                        </div>
                    </button>
                </div>

                {/* Tooltip */}
                {isHovered && cart.length > 0 && (
                    <div className="absolute bottom-20 left-0 bg-white text-gray-900 p-3 rounded-lg shadow-xl border border-gray-200 min-w-64">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Checkout Rápido</span>
                            <span className="text-xs text-gray-500">{totalItems} ítems</span>
                        </div>
                        
                        <div className="space-y-2 max-h-32 overflow-y-auto text-sm">
                            {cart.slice(0, 2).map(item => (
                                <div key={item.producto_id} className="flex items-center justify-between">
                                    <span className="truncate">{item.nombre}</span>
                                    <span className="font-medium">${((item.costo_modificado || item.costo) * item.cantidad).toFixed(2)}</span>
                                </div>
                            ))}
                            {cart.length > 2 && (
                                <div className="text-xs text-gray-500 text-center pt-1">
                                    +{cart.length - 2} ítems más
                                </div>
                            )}
                        </div>
                        
                        <div className="border-t border-gray-200 mt-2 pt-2">
                            <div className="flex items-center justify-between font-bold text-green-600">
                                <span>Total:</span>
                                <span>${totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Checkout Form Modal */}
            {showCheckoutForm && cart.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Checkout</h3>
                                <button
                                    onClick={() => setShowCheckoutForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-600">Total ítems:</span>
                                    <span className="font-medium">{totalItems}</span>
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-600">Total:</span>
                                    <span className="text-2xl font-bold text-green-600">${totalPrice.toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={customerData.nombre}
                                        onChange={(e) => setCustomerData({...customerData, nombre: e.target.value})}
                                        placeholder="Nombre del cliente"
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="tel"
                                        value={customerData.telefono}
                                        onChange={(e) => setCustomerData({...customerData, telefono: e.target.value})}
                                        placeholder="Teléfono"
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <textarea
                                    value={customerData.observaciones}
                                    onChange={(e) => setCustomerData({...customerData, observaciones: e.target.value})}
                                    placeholder="Observaciones (opcional)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setShowCheckoutForm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Procesando...' : 'Confirmar Compra'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}