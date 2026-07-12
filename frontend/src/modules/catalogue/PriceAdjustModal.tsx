import { useState } from 'react';
import type { Producto } from './types';

interface PriceAdjustModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProducts: Producto[];
    onApply: (porcentaje: number) => Promise<void>;
    loading: boolean;
}

export default function PriceAdjustModal({
    isOpen,
    onClose,
    selectedProducts,
    onApply,
    loading
}: PriceAdjustModalProps) {
    const [porcentaje, setPorcentaje] = useState<number>(0);

    if (!isOpen) return null;

    const invalid = porcentaje <= -100;
    const factor = 1 + porcentaje / 100;

    const rows = selectedProducts.map(p => {
        const nuevoPrecio = Math.round(p.costo * factor);
        // Cost basis: existing cost if set, otherwise the current price (captured on apply).
        const costoEfectivo = p.precio_compra != null && p.precio_compra > 0 ? p.precio_compra : p.costo;
        const margen = costoEfectivo > 0 ? ((nuevoPrecio - costoEfectivo) / costoEfectivo) * 100 : 0;
        return { p, nuevoPrecio, margen };
    });

    const handleApply = async () => {
        if (invalid) return;
        await onApply(porcentaje);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Ajustar precios</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        {selectedProducts.length} producto(s) seleccionados. Si un producto todavía no tiene costo,
                        su precio actual se guardará como costo; el nuevo precio se redondea al peso.
                    </p>

                    <div className="flex items-end gap-3 mb-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ajuste (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={Number.isNaN(porcentaje) ? '' : porcentaje}
                                onChange={(e) => setPorcentaje(parseFloat(e.target.value) || 0)}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex gap-2 pb-1">
                            {[10, 15, 20, 30].map(v => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setPorcentaje(v)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                >
                                    +{v}%
                                </button>
                            ))}
                        </div>
                    </div>
                    {invalid && (
                        <p className="text-red-500 text-sm mb-2">El ajuste no puede ser -100% o menor.</p>
                    )}

                    <div className="border border-gray-200 rounded-md overflow-hidden my-4 max-h-72 overflow-y-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Precio actual</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Precio nuevo</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Margen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map(({ p, nuevoPrecio, margen }) => (
                                    <tr key={p.id}>
                                        <td className="px-3 py-2 text-gray-900 truncate max-w-[240px]" title={p.nombre}>
                                            {p.nombre}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-500">$ {p.costo.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-medium text-green-600">$ {nuevoPrecio.toFixed(2)}</td>
                                        <td className={`px-3 py-2 text-right ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {margen >= 0 ? '+' : ''}{margen.toFixed(0)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={loading || invalid}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Aplicando...' : `Aplicar a ${selectedProducts.length} producto(s)`}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
