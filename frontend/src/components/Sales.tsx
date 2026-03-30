import { useState } from 'react';
import POSInterface from '../modules/sales/POSInterface';
import SalesHistory from '../modules/sales/SalesHistory';

export default function Sales() {
    const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

    return (
        <div className="space-y-6">
            {/* Module Actions Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Ventas</h1>
                    <p className="text-gray-600 mt-1">
                        Registra y gestiona tus transacciones comerciales
                    </p>
                </div>
                
                <div className="flex items-center space-x-3">
                    {/* Tab Navigation */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('pos')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                activeTab === 'pos'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            💰 Punto de Venta
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                activeTab === 'history'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📊 Historial
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'pos' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Punto de Venta</h2>
                            <div className="flex items-center space-x-3">
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                    En línea
                                </span>
                                <span className="text-sm text-gray-500">Terminal activa</span>
                            </div>
                        </div>
                        <POSInterface />
                    </div>
                )}
                
                {activeTab === 'history' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Historial de Ventas</h2>
                            <div className="flex items-center space-x-3">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                    Registro completo
                                </span>
                                <span className="text-sm text-gray-500">Últimos 30 días</span>
                            </div>
                        </div>
                        <SalesHistory />
                    </div>
                )}
            </div>
        </div>
    );
}
