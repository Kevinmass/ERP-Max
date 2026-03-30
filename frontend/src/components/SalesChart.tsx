import React from 'react';
import { useDashboard } from '../context/DashboardContext';

const SalesChart: React.FC = () => {
    const { salesTrend, isLoading } = useDashboard();

    if (isLoading || !salesTrend || salesTrend.length === 0) {
        return (
            <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-600 text-sm">Cargando datos de ventas...</p>
                </div>
            </div>
        );
    }

    // Calculate max value for chart scaling
    const maxValue = Math.max(...salesTrend.map(item => item.total));
    const minValue = Math.min(...salesTrend.map(item => item.total));

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tendencia de Ventas (Últimos 7 Días)</h3>
                <div className="text-sm text-gray-600">
                    Total: {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                    }).format(salesTrend.reduce((sum, item) => sum + item.total, 0))}
                </div>
            </div>
            
            <div className="h-48 flex items-end justify-between space-x-2">
                {salesTrend.map((item, index) => {
                    // Calculate height percentage for the bar
                    const heightPercent = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
                    const isMax = item.total === maxValue;
                    const isMin = item.total === minValue && item.total > 0;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                            {/* Bar Chart */}
                            <div className="w-full flex justify-center">
                                <div 
                                    className={`w-4/5 rounded-t-lg transition-all duration-500 hover:opacity-80 ${
                                        isMax ? 'bg-gradient-to-t from-green-500 to-green-400' : 
                                        isMin ? 'bg-gradient-to-t from-orange-500 to-orange-400' :
                                        'bg-gradient-to-t from-blue-500 to-blue-400'
                                    }`}
                                    style={{ 
                                        height: `${Math.max(heightPercent, 5)}%`,
                                        minHeight: '10px'
                                    }}
                                ></div>
                            </div>
                            
                            {/* Value Label */}
                            <div className="text-xs font-medium text-gray-600 text-center">
                                {new Intl.NumberFormat('es-AR', {
                                    style: 'currency',
                                    currency: 'ARS',
                                    maximumFractionDigits: 0
                                }).format(item.total)}
                            </div>
                            
                            {/* Date Label */}
                            <div className="text-xs text-gray-500 text-center">
                                {formatDate(item.date)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SalesChart;