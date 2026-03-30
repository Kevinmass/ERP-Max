import { useState } from 'react';
import { CartItem } from './types';

interface CartSummaryProps {
    cart: CartItem[];
    onToggleCart: () => void;
    isVisible: boolean;
}

export default function CartSummary({ cart, onToggleCart, isVisible }: CartSummaryProps) {
    const [isHovered, setIsHovered] = useState(false);

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

    return (
        <div className={`
            fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out
            ${isVisible ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
        `}>
            <button
                onClick={onToggleCart}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-lg
                    hover:from-blue-700 hover:to-blue-800 transform transition-all duration-300
                    hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300
                    ${isHovered ? 'ring-4 ring-blue-300' : ''}
                `}
                aria-label={`Carrito: ${totalItems} ítems, $${totalPrice.toFixed(2)}`}
            >
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">🛒</span>
                    {totalItems > 0 && (
                        <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                            {totalItems}
                        </div>
                    )}
                </div>
            </button>

            {/* Tooltip */}
            {isHovered && (
                <div className="absolute bottom-16 right-0 bg-white text-gray-900 p-3 rounded-lg shadow-xl border border-gray-200 min-w-64">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Carrito de Compras</span>
                        <span className="text-xs text-gray-500">{totalItems} ítems</span>
                    </div>
                    
                    {cart.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cart.slice(0, 3).map(item => (
                                <div key={item.producto_id} className="flex items-center justify-between text-sm">
                                    <span className="truncate">{item.nombre}</span>
                                    <span className="font-medium">${((item.costo_modificado || item.costo) * item.cantidad).toFixed(2)}</span>
                                </div>
                            ))}
                            {cart.length > 3 && (
                                <div className="text-xs text-gray-500 text-center pt-1">
                                    +{cart.length - 3} ítems más
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-2">
                            El carrito está vacío
                        </div>
                    )}
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                        <div className="flex items-center justify-between font-bold text-green-600">
                            <span>Total:</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}