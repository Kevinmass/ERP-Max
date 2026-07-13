import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { CircleDollarSign, Search, AlertTriangle, Link2, Package, Receipt, ShoppingBag } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { getImportaciones, getMatchingStats } from '../api/matching';
import type { InventoryItem, InventoryResponse } from '../modules/stock/types';

// «Hoy» — the landing screen (§6 S1 in DESIGN_DIRECTION.md). Three bands:
// action (nueva venta + búsqueda), atención (real items only, collapses if
// nothing needs attention), and hoy en números (today-only stats).
// SQLite dates are 'YYYY-MM-DD'; parse as LOCAL date (new Date(iso) would
// parse as UTC midnight and shift a day back in UTC-3).
const parseLocalDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export default function Hoy() {
    const navigate = useNavigate();
    const { stats, salesTrend, isLoading } = useDashboard();
    const [searchValue, setSearchValue] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [pendingReviews, setPendingReviews] = useState(0);
    const [attentionLoading, setAttentionLoading] = useState(true);

    useEffect(() => {
        const loadAttention = async () => {
            try {
                const [inventoryResponse, importaciones] = await Promise.all([
                    invoke<InventoryResponse>('get_inventory_list'),
                    getImportaciones(),
                ]);

                setLowStockItems(inventoryResponse.data.filter(item => item.is_low_stock));

                // No aggregate "pending across all imports" endpoint exists yet,
                // so this sums the existing per-import stats client-side.
                const statsPerImport = await Promise.all(
                    importaciones
                        .filter(imp => imp.id !== null)
                        .map(imp => getMatchingStats(imp.id as number).catch(() => null))
                );
                const totalPending = statsPerImport.reduce((sum, s) => sum + (s?.pendientes ?? 0), 0);
                setPendingReviews(totalPending);
            } catch (error) {
                console.error('Error loading atención data:', error);
            } finally {
                setAttentionLoading(false);
            }
        };
        loadAttention();
    }, []);

    // F2 = nueva venta, from anywhere on this screen.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                navigate('/sales');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            navigate(`/catalogue?q=${encodeURIComponent(searchValue.trim())}`);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    const hasAttention = lowStockItems.length > 0 || pendingReviews > 0;

    // Greeting band — time-of-day salute + full Spanish date.
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const todayLabel = (() => {
        const s = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    })();

    // Last 7 days, padded so days without sales still show as empty bars.
    const trendByDate = new Map(salesTrend.map(t => [t.date, t]));
    const last7: { date: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const hit = trendByDate.get(iso);
        last7.push({ date: iso, total: hit?.total ?? 0, count: hit?.count ?? 0 });
    }
    const maxTrend = Math.max(...last7.map(t => t.total), 1);
    const trendHasData = last7.some(t => t.total > 0);
    const trendDayLabel = (iso: string) =>
        parseLocalDate(iso).toLocaleDateString('es-AR', { weekday: 'short' });

    return (
        <div className="space-y-8 stagger-rise">
            {/* Greeting band */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{greeting}</h1>
                <p className="text-gray-500 mt-1">{todayLabel}</p>
            </div>

            {/* Action band */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => navigate('/sales')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base"
                >
                    <CircleDollarSign className="w-5 h-5" strokeWidth={1.5} />
                    Nueva venta
                    <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-blue-700 rounded">F2</kbd>
                </button>

                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Buscar productos en el catálogo..."
                        className="w-full h-full min-h-[48px] px-4 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    />
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                </form>
            </div>

            {/* Atención strip — real items only; collapses when there's nothing */}
            {!attentionLoading && hasAttention && (
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" strokeWidth={1.5} />
                        <h2 className="text-sm font-semibold text-orange-800 uppercase tracking-wide">Atención</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {lowStockItems.length > 0 && (
                            <button
                                onClick={() => navigate('/stock')}
                                className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Package className="w-4 h-4 text-orange-600" strokeWidth={1.5} />
                                    <span className="text-sm text-gray-900">
                                        {lowStockItems.length} producto(s) con stock bajo
                                    </span>
                                    <span className="text-xs text-gray-500 truncate max-w-md">
                                        {lowStockItems.slice(0, 3).map(i => i.product_name).join(', ')}
                                        {lowStockItems.length > 3 ? '…' : ''}
                                    </span>
                                </div>
                                <span className="text-xs text-blue-600 font-medium">Ver inventario →</span>
                            </button>
                        )}
                        {pendingReviews > 0 && (
                            <button
                                onClick={() => navigate('/matching')}
                                className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Link2 className="w-4 h-4 text-orange-600" strokeWidth={1.5} />
                                    <span className="text-sm text-gray-900">
                                        {pendingReviews} coincidencia(s) de proveedor pendientes de revisión
                                    </span>
                                </div>
                                <span className="text-xs text-blue-600 font-medium">Revisar →</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Hoy en números — today only; deep analysis lives in Análisis */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hoy en números</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <CircleDollarSign className="w-4 h-4" strokeWidth={1.5} />
                            Ventas de hoy
                        </div>
                        <div className="text-2xl font-bold text-gray-900 tabular-nums">
                            {isLoading ? '—' : formatCurrency(stats?.today_sales ?? 0)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <Receipt className="w-4 h-4" strokeWidth={1.5} />
                            Operaciones
                        </div>
                        <div className="text-2xl font-bold text-gray-900 tabular-nums">
                            {isLoading ? '—' : (stats?.today_sales_count ?? 0)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                            Artículos vendidos
                        </div>
                        <div className="text-2xl font-bold text-gray-900 tabular-nums">
                            {isLoading ? '—' : (stats?.today_items_sold ?? 0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ventas — últimos 7 días (real data; honest empty state if none) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Ventas — últimos 7 días
                    </h2>
                    {trendHasData && (
                        <span className="text-sm font-semibold text-green-600 tabular-nums">
                            {formatCurrency(last7.reduce((s, t) => s + t.total, 0))}
                        </span>
                    )}
                </div>
                {!trendHasData ? (
                    <div className="h-24 flex items-center justify-center text-sm text-gray-400">
                        Sin ventas registradas en los últimos 7 días
                    </div>
                ) : (
                    <div className="flex items-end gap-2">
                        {last7.map((item) => (
                            <div
                                key={item.date}
                                className="flex-1 flex flex-col items-center"
                                title={`${formatCurrency(item.total)} · ${item.count} operación(es)`}
                            >
                                <div
                                    className="w-full max-w-[56px] rounded-t transition-opacity hover:opacity-75"
                                    style={{
                                        height: `${Math.max(Math.round((item.total / maxTrend) * 96), 4)}px`,
                                        backgroundColor: item.total > 0 ? 'var(--accent)' : 'var(--border)',
                                    }}
                                />
                                <span className="mt-1.5 text-[11px] text-gray-500">
                                    {trendDayLabel(item.date)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
