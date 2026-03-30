import { Link } from 'react-router-dom';
import { MODULES } from '../modules_config';
import KpiCard from './KpiCard';
import { useDashboard } from '../context/DashboardContext';
import SalesChart from './SalesChart';

export default function Dashboard() {
    const { stats, kpiConfig, refreshDashboard } = useDashboard();

    const handleHomeClick = () => {
        refreshDashboard();
    };

    // Format numbers with locale
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-AR').format(num);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    // KPI configuration with real data
    const kpiData = [
        {
            id: 'total_products',
            title: 'Productos Totales',
            value: stats ? formatNumber(stats.total_products) : '0',
            subtitle: 'Active inventory items',
            icon: '📦',
            trend: { value: 12.5, label: 'vs last month', isPositive: true },
            color: 'blue' as const,
            show: kpiConfig?.show_total_products ?? true
        },
        {
            id: 'today_sales',
            title: 'Ventas de Hoy',
            value: stats ? formatCurrency(stats.today_sales) : '$0',
            subtitle: 'Revenue generated today',
            icon: '💰',
            trend: { value: 8.2, label: 'vs yesterday', isPositive: true },
            color: 'green' as const,
            show: kpiConfig?.show_today_sales ?? true
        },
        {
            id: 'low_stock',
            title: 'Productos con Stock Bajo',
            value: stats ? formatNumber(stats.low_stock_items) : '0',
            subtitle: 'Products below minimum',
            icon: '⚠️',
            trend: { value: -3.1, label: 'vs last week', isPositive: false },
            color: 'orange' as const,
            show: kpiConfig?.show_low_stock ?? true
        },
        {
            id: 'active_categories',
            title: 'Categorias Activas',
            value: stats ? formatNumber(stats.active_categories) : '0',
            subtitle: 'Product categories',
            icon: '📚',
            trend: { value: 0, label: 'no change', isPositive: true },
            color: 'purple' as const,
            show: kpiConfig?.show_active_categories ?? true
        },
        {
            id: 'total_revenue',
            title: 'Total Revenue',
            value: stats ? formatCurrency(stats.total_revenue) : '$0',
            subtitle: 'All-time revenue',
            icon: '💼',
            trend: { value: 15.2, label: 'vs last month', isPositive: true },
            color: 'blue' as const,
            show: kpiConfig?.show_total_revenue ?? false
        },
        {
            id: 'sales_count',
            title: 'Total Ventas',
            value: stats ? formatNumber(stats.sales_count) : '0',
            subtitle: 'Transacciones completadas',
            icon: '📈',
            trend: { value: 5.8, label: 'vs last month', isPositive: true },
            color: 'green' as const,
            show: kpiConfig?.show_sales_count ?? false
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                                Dashboard
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Overview of your business operations
                            </p>
                        </div>
                        <div className="hidden lg:flex items-center space-x-4">
                            <button
                                onClick={handleHomeClick}
                                className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:scale-105"
                                title="Refresh Dashboard"
                            >
                                <span className="text-2xl">🔄</span>
                            </button>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Last updated</p>
                                <p className="text-sm font-medium text-gray-700">
                                    {new Date().toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/catalogue"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <span>➕</span>
                            <span>Añadir Producto</span>
                        </Link>
                        <Link
                            to="/sales"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                            <span>💰</span>
                            <span>Nueva Venta</span>
                        </Link>
                        <Link
                            to="/stock"
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                        >
                            <span>📦</span>
                            <span>Ver Inventario</span>
                        </Link>
                    </div>
                </div>
                
                {/* Mobile Last Updated */}
                <div className="lg:hidden text-center text-sm text-gray-500">
                    <p>Last updated: {new Date().toLocaleString()}</p>
                </div>
            </div>

            {/* KPI Cards Grid */}
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
                            trend={kpi.trend}
                            color={kpi.color}
                        />
                    ))}
            </div>

            {/* Modules Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Quick Access</h2>
                    <p className="text-sm text-gray-600">Navigate to modules</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MODULES.map(module => (
                        <Link
                            key={module.id}
                            to={module.route}
                            className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <span className="text-xl">{module.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                        {module.name}
                                    </h3>
                                    {module.description && (
                                        <p className="text-sm text-gray-600 mt-1 truncate">
                                            {module.description}
                                        </p>
                                    )}
                                </div>
                                <div className="text-blue-600 group-hover:text-blue-800 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <SalesChart />

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {[
                            { action: 'Nuevo producto ', time: '2 min ago', icon: '➕' },
                            { action: 'Venta completada', time: '15 min ago', icon: '💰' },
                            { action: 'Stock actualizado', time: '1 hour ago', icon: '📦' },
                            { action: 'Categoría creada', time: '3 hours ago', icon: '📚' }
                        ].map((activity, index) => (
                            <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <span className="text-lg">{activity.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Database</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Online
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">API Services</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Active
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Storage</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-white-800">
                                45% Used
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Last Backup</span>
                            <span className="text-sm text-gray-500">2 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
