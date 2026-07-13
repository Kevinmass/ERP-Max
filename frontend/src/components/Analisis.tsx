import { useEffect, useState } from 'react';
import { Package, CircleDollarSign, AlertTriangle, BookOpen, Briefcase, TrendingUp, RefreshCw, Boxes, PackageX } from 'lucide-react';
import KpiCard from './KpiCard';
import { useDashboard } from '../context/DashboardContext';
import { getTopSellingProducts, getRevenueByCategory, TopProduct, CategoryRevenue } from '../api/dashboard';
import SalesChart from './SalesChart';

// «Análisis» — the honest dashboard (§6 S3 in DESIGN_DIRECTION.md). Real KPIs
// with no fabricated deltas, the real sales trend, nothing else. The old
// Dashboard's "Recent Activity" and "System Status" panels were hardcoded
// fake data (Finding H5) and have been removed rather than reworked.
const INVENTORY_STATUS_LABELS: Record<string, string> = {
    normal: 'Normal',
    low: 'Stock Bajo',
    out_of_stock: 'Sin Stock',
};

const INVENTORY_STATUS_COLORS: Record<string, string> = {
    normal: 'bg-green-500',
    low: 'bg-yellow-500',
    out_of_stock: 'bg-red-500',
};

export default function Analisis() {
    const { stats, kpiConfig, inventoryStatus, refreshDashboard } = useDashboard();
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([]);

    useEffect(() => {
        getTopSellingProducts(5).then(setTopProducts).catch(err => console.error('Error loading top products:', err));
        getRevenueByCategory().then(setCategoryRevenue).catch(err => console.error('Error loading category revenue:', err));
    }, []);

    const formatNumber = (num: number) => new Intl.NumberFormat('es-AR').format(num);
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    const totalInventoryItems = inventoryStatus.reduce((sum, s) => sum + s.count, 0);
    const maxProductQty = Math.max(1, ...topProducts.map(p => p.cantidad_vendida));
    const maxCategoryRevenue = Math.max(1, ...categoryRevenue.map(c => c.ingresos));

    // No trend/delta fields: the app has no month-over-month comparison data,
    // so per the design direction these show "real deltas or no deltas" — no deltas.
    const kpiData = [
        {
            id: 'total_products',
            title: 'Productos Totales',
            value: stats ? formatNumber(stats.total_products) : '0',
            subtitle: 'Productos activos en catálogo',
            icon: Package,
            color: 'blue' as const,
            show: kpiConfig?.show_total_products ?? true
        },
        {
            id: 'today_sales',
            title: 'Ventas de Hoy',
            value: stats ? formatCurrency(stats.today_sales) : '$0',
            subtitle: 'Ingresos generados hoy',
            icon: CircleDollarSign,
            color: 'green' as const,
            show: kpiConfig?.show_today_sales ?? true
        },
        {
            id: 'low_stock',
            title: 'Productos con Stock Bajo',
            value: stats ? formatNumber(stats.low_stock_items) : '0',
            subtitle: 'Por debajo del mínimo',
            icon: AlertTriangle,
            color: 'orange' as const,
            show: kpiConfig?.show_low_stock ?? true
        },
        {
            id: 'active_categories',
            title: 'Categorías Activas',
            value: stats ? formatNumber(stats.active_categories) : '0',
            subtitle: 'Categorías de producto',
            icon: BookOpen,
            color: 'purple' as const,
            show: kpiConfig?.show_active_categories ?? true
        },
        {
            id: 'total_revenue',
            title: 'Ingresos Totales',
            value: stats ? formatCurrency(stats.total_revenue) : '$0',
            subtitle: 'Histórico acumulado',
            icon: Briefcase,
            color: 'blue' as const,
            show: kpiConfig?.show_total_revenue ?? false
        },
        {
            id: 'sales_count',
            title: 'Total Ventas',
            value: stats ? formatNumber(stats.sales_count) : '0',
            subtitle: 'Transacciones completadas',
            icon: TrendingUp,
            color: 'green' as const,
            show: kpiConfig?.show_sales_count ?? false
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Análisis</h1>
                    <p className="text-gray-600 mt-2">Métricas reales del negocio</p>
                </div>
                <button
                    onClick={refreshDashboard}
                    className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300"
                    title="Actualizar"
                >
                    <RefreshCw className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData
                    .filter(kpi => kpi.show)
                    .map((kpi) => (
                        <KpiCard
                            key={kpi.id}
                            title={kpi.title}
                            value={kpi.value}
                            subtitle={kpi.subtitle}
                            icon={kpi.icon}
                            color={kpi.color}
                        />
                    ))}
            </div>

            <SalesChart />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory status breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 inline-flex items-center gap-2">
                        <Boxes className="w-5 h-5 text-gray-500" strokeWidth={1.5} /> Estado del Inventario
                    </h3>
                    {totalInventoryItems === 0 ? (
                        <p className="text-sm text-gray-500">Sin datos de inventario todavía.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
                                {inventoryStatus.map(s => (
                                    <div
                                        key={s.status}
                                        className={INVENTORY_STATUS_COLORS[s.status] ?? 'bg-gray-400'}
                                        style={{ width: `${(s.count / totalInventoryItems) * 100}%` }}
                                    />
                                ))}
                            </div>
                            {inventoryStatus.map(s => (
                                <div key={s.status} className="flex items-center justify-between text-sm">
                                    <span className="inline-flex items-center gap-2 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${INVENTORY_STATUS_COLORS[s.status] ?? 'bg-gray-400'}`} />
                                        {INVENTORY_STATUS_LABELS[s.status] ?? s.status}
                                    </span>
                                    <span className="font-medium text-gray-900">{formatNumber(s.count)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top selling products */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 inline-flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-500" strokeWidth={1.5} /> Productos Más Vendidos
                    </h3>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 inline-flex items-center gap-2">
                            <PackageX className="w-4 h-4" strokeWidth={1.5} /> Todavía no hay ventas registradas.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {topProducts.map(p => (
                                <div key={p.producto_id}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-700 truncate pr-2">{p.nombre}</span>
                                        <span className="text-gray-500 shrink-0">{formatNumber(p.cantidad_vendida)} u.</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-2 bg-blue-500 rounded-full"
                                            style={{ width: `${(p.cantidad_vendida / maxProductQty) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Revenue by category */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 inline-flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-gray-500" strokeWidth={1.5} /> Ingresos por Categoría
                    </h3>
                    {categoryRevenue.length === 0 ? (
                        <p className="text-sm text-gray-500">Todavía no hay ventas registradas.</p>
                    ) : (
                        <div className="space-y-3">
                            {categoryRevenue.map(c => (
                                <div key={c.categoria}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-700 truncate pr-2">{c.categoria}</span>
                                        <span className="text-gray-500 shrink-0">{formatCurrency(c.ingresos)}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-2 bg-purple-500 rounded-full"
                                            style={{ width: `${(c.ingresos / maxCategoryRevenue) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
