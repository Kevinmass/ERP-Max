import { useState } from 'react';
import { CircleDollarSign, BarChart3 } from 'lucide-react';
import POSInterface from '../modules/sales/POSInterface';
import SalesHistory from '../modules/sales/SalesHistory';

export default function Sales() {
    const [activeTab, setActiveTab] = useState<'pos' | 'history'>(
        () => new URLSearchParams(window.location.search).get('tab') === 'history' ? 'history' : 'pos'
    );

    return (
        <div className="space-y-6">
            {/* Single page header + tab toggle (no nested cards/titles) */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Ventas</h1>
                    <p className="text-gray-600 mt-1">
                        Registra y gestiona tus transacciones comerciales
                    </p>
                </div>

                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                            activeTab === 'pos'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <CircleDollarSign className="w-4 h-4" strokeWidth={1.5} /> Vender
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                            activeTab === 'history'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <BarChart3 className="w-4 h-4" strokeWidth={1.5} /> Historial
                    </button>
                </div>
            </div>

            {activeTab === 'pos' ? <POSInterface /> : <SalesHistory />}
        </div>
    );
}
