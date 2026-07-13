import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { VentaResponse } from './types';

interface ReceiptCardProps {
    venta: VentaResponse;
    onDismiss: () => void;
}

// The one expressive motion moment (§5): the cart panel resolves into a
// receipt card — mono type, dashed rule edges — and auto-clears to a fresh
// sale after 2s or on any keypress/click.
export default function ReceiptCard({ venta, onDismiss }: ReceiptCardProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 2000);
        const dismissEarly = () => onDismiss();
        window.addEventListener('keydown', dismissEarly);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', dismissEarly);
        };
    }, [onDismiss]);

    return (
        <div
            className="fixed top-0 right-0 h-full w-96 z-50 flex items-center justify-center bg-white border-l border-gray-200 shadow-xl animate-receipt-in cursor-pointer"
            onClick={onDismiss}
        >
            <div className="mx-6 w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center font-mono">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-600" strokeWidth={1.5} />
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Venta registrada</div>
                <div className="text-4xl font-bold tabular-nums text-gray-900 mb-1">
                    ${venta.venta.total.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Venta #{venta.venta.id}</div>
                <div className="mt-6 text-xs text-gray-400">Nueva venta en unos segundos… (o presioná una tecla)</div>
            </div>
        </div>
    );
}
