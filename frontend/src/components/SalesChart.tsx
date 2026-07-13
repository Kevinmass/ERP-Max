import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { getSalesTrend, SalesTrend as SalesTrendItem } from '../api/dashboard';

const RANGE_OPTIONS = [7, 30, 90] as const;

const SalesChart: React.FC = () => {
    const { salesTrend: defaultTrend, isLoading: isLoadingDefault } = useDashboard();
    const [days, setDays] = useState<typeof RANGE_OPTIONS[number]>(7);
    const [customTrend, setCustomTrend] = useState<SalesTrendItem[] | null>(null);
    const [loadingCustom, setLoadingCustom] = useState(false);

    // 7 days reuses the shared dashboard fetch; wider ranges fetch on demand
    // so we don't force every dashboard consumer to load 90 days of history.
    useEffect(() => {
        if (days === 7) {
            setCustomTrend(null);
            return;
        }
        setLoadingCustom(true);
        getSalesTrend(days)
            .then(setCustomTrend)
            .catch(err => console.error('Error loading sales trend:', err))
            .finally(() => setLoadingCustom(false));
    }, [days]);

    const salesTrend = days === 7 ? defaultTrend : customTrend;
    const isLoading = days === 7 ? isLoadingDefault : loadingCustom;

    if (isLoading || !salesTrend || salesTrend.length === 0) {
        return (
            <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-400" strokeWidth={1.5} />
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

    // 30/90-day views pack too many bars to label each one — show the date
    // every few bars instead of on all of them, and skip the value label.
    const labelStride = days === 7 ? 1 : days === 30 ? 5 : 10;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tendencia de Ventas</h3>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setDays(opt)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                    days === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {opt}d
                            </button>
                        ))}
                    </div>
                    <div className="text-sm text-gray-600">
                        Total: {new Intl.NumberFormat('es-AR', {
                            style: 'currency',
                            currency: 'ARS'
                        }).format(salesTrend.reduce((sum, item) => sum + item.total, 0))}
                    </div>
                </div>
            </div>

            <div className="h-48 overflow-x-auto">
                <div className={`h-full flex items-end ${days === 7 ? 'justify-between space-x-2' : 'gap-1'}`}
                     style={days !== 7 ? { minWidth: `${salesTrend.length * 14}px` } : undefined}>
                    {salesTrend.map((item, index) => {
                        // Calculate height percentage for the bar
                        const heightPercent = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
                        const isMax = item.total === maxValue;
                        const isMin = item.total === minValue && item.total > 0;
                        const showLabel = index % labelStride === 0;

                        return (
                            <div key={index} className={`${days === 7 ? 'flex-1' : 'w-3 shrink-0'} flex flex-col items-center space-y-2`}>
                                {/* Bar Chart */}
                                <div className="w-full flex justify-center" title={formatDate(item.date)}>
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
                                {days === 7 && (
                                    <div className="text-xs font-medium text-gray-600 text-center">
                                        {new Intl.NumberFormat('es-AR', {
                                            style: 'currency',
                                            currency: 'ARS',
                                            maximumFractionDigits: 0
                                        }).format(item.total)}
                                    </div>
                                )}

                                {/* Date Label */}
                                {showLabel && (
                                    <div className="text-xs text-gray-500 text-center whitespace-nowrap">
                                        {formatDate(item.date)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SalesChart;