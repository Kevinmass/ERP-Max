import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { VentaResponse } from './types';
import { generateSaleReceiptPDF, formatBusinessInfo, formatCustomerInfo } from '../../utils/pdfGenerator';
import { Settings } from '../settings/types';

export default function SalesHistory() {
    const [sales, setSales] = useState<VentaResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<VentaResponse | null>(null);
    const [archivingSaleId, setArchivingSaleId] = useState<number | null>(null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [saleToArchive, setSaleToArchive] = useState<VentaResponse | null>(null);
    const [unarchivingSaleId, setUnarchivingSaleId] = useState<number | null>(null);
    const [showUnarchiveConfirm, setShowUnarchiveConfirm] = useState(false);
    const [saleToUnarchive, setSaleToUnarchive] = useState<VentaResponse | null>(null);
    const [downloadingSaleId, setDownloadingSaleId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'archived' | 'all'>('active');
    const limit = 20;

    useEffect(() => {
        loadSales();
    }, [page, viewMode]);

    const loadSales = async () => {
        try {
            setLoading(true);
            let result: VentaResponse[];
            
            if (viewMode === 'archived') {
                result = await invoke<VentaResponse[]>('get_archived_sales', {
                    limit,
                    offset: page * limit
                });
            } else {
                result = await invoke<VentaResponse[]>('get_sales_history_with_filter', {
                    limit,
                    offset: page * limit,
                    onlyActive: viewMode === 'active'
                });
            }

            if (page === 0) {
                setSales(result);
            } else {
                setSales(prev => [...prev, ...result]);
            }

            setHasMore(result.length === limit);
        } catch (error) {
            console.error('Error loading sales history:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    const handleDeleteSale = async (saleResponse: VentaResponse) => {
        setSaleToDelete(saleResponse);
        setShowDeleteConfirm(true);
    };

    const handleArchiveSale = async (saleResponse: VentaResponse) => {
        setSaleToArchive(saleResponse);
        setShowArchiveConfirm(true);
    };

    const handleUnarchiveSale = async (saleResponse: VentaResponse) => {
        setSaleToUnarchive(saleResponse);
        setShowUnarchiveConfirm(true);
    };

    const confirmDeleteSale = async () => {
        if (!saleToDelete) return;

        const saleId = saleToDelete.venta.id;
        try {
            setDeletingSaleId(saleId);
            await invoke('delete_sale', { saleId });
            
            // Remove the deleted sale from the list
            setSales(prev => prev.filter(sale => sale.venta.id !== saleId));
            alert('Venta eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting sale:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar la venta';
            alert(`Error al eliminar la venta: ${errorMessage}`);
        } finally {
            setDeletingSaleId(null);
            setShowDeleteConfirm(false);
            setSaleToDelete(null);
        }
    };

    const confirmArchiveSale = async () => {
        if (!saleToArchive) return;

        const saleId = saleToArchive.venta.id;
        try {
            setArchivingSaleId(saleId);
            await invoke('archive_sale', { saleId });
            
            // Remove the archived sale from the list
            setSales(prev => prev.filter(sale => sale.venta.id !== saleId));
            alert('Venta archivada exitosamente');
        } catch (error) {
            console.error('Error archiving sale:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al archivar la venta';
            alert(`Error al archivar la venta: ${errorMessage}`);
        } finally {
            setArchivingSaleId(null);
            setShowArchiveConfirm(false);
            setSaleToArchive(null);
        }
    };

    const confirmUnarchiveSale = async () => {
        if (!saleToUnarchive) return;

        const saleId = saleToUnarchive.venta.id;
        try {
            setUnarchivingSaleId(saleId);
            await invoke('unarchive_sale', { saleId });
            
            // Remove the unarchived sale from the list
            setSales(prev => prev.filter(sale => sale.venta.id !== saleId));
            alert('Venta desarchivada exitosamente');
        } catch (error) {
            console.error('Error unarchiving sale:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al desarchivar la venta';
            alert(`Error al desarchivar la venta: ${errorMessage}`);
        } finally {
            setUnarchivingSaleId(null);
            setShowUnarchiveConfirm(false);
            setSaleToUnarchive(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setSaleToDelete(null);
    };

    const cancelArchive = () => {
        setShowArchiveConfirm(false);
        setSaleToArchive(null);
    };

    const cancelUnarchive = () => {
        setShowUnarchiveConfirm(false);
        setSaleToUnarchive(null);
    };

    const handleDownloadPDF = async (saleResponse: VentaResponse) => {
        try {
            setDownloadingSaleId(saleResponse.venta.id);
            
            // Get business settings
            const settingsMap: Record<string, string> = await invoke('get_settings');
            const settings: Settings = {
                company_name: settingsMap.company_name || '',
                business_address: settingsMap.business_address || '',
                business_city: settingsMap.business_city || '',
                business_phone: settingsMap.business_phone || '',
                business_email: settingsMap.business_email || '',
                business_website: settingsMap.business_website || '',
                theme_name: (settingsMap.theme_name as 'blue' | 'green' | 'purple' | 'professional') || 'blue',
                theme_variant: (settingsMap.theme_variant as 'light' | 'dark') || 'light',
                font_size: (settingsMap.font_size as 'small' | 'medium' | 'large') || 'medium',
                language: (settingsMap.language as 'en' | 'es') || 'en',
                tax_rate: parseFloat(settingsMap.tax_rate) || 0,
            };

            // Generate PDF
            generateSaleReceiptPDF(
                saleResponse,
                formatBusinessInfo(settings),
                formatCustomerInfo(saleResponse.venta)
            );
            
            alert('PDF generado exitosamente');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        } finally {
            setDownloadingSaleId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Historial de Ventas</h2>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {sales.length === 0 && !loading ? (
                        <li className="px-6 py-4 text-center text-gray-500">
                            No hay ventas registradas
                        </li>
                    ) : (
                        sales.map((saleResponse) => (
                            <li key={saleResponse.venta.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Venta #{saleResponse.venta.id}
                                                </p>
                                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    saleResponse.venta.estado === 'completa'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {saleResponse.venta.estado}
                                                </span>
                                                {saleResponse.venta.archivado && (
                                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        📦 Archivada
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleDownloadPDF(saleResponse)}
                                                    disabled={loading || downloadingSaleId !== null}
                                                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    📄 PDF
                                                </button>
                                                {viewMode === 'active' && (
                                                    <button
                                                        onClick={() => handleArchiveSale(saleResponse)}
                                                        disabled={loading || archivingSaleId !== null}
                                                        className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        📦 Archivar
                                                    </button>
                                                )}
                                                {viewMode === 'archived' && (
                                                    <button
                                                        onClick={() => handleUnarchiveSale(saleResponse)}
                                                        disabled={loading || unarchivingSaleId !== null}
                                                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        🔄 Desarchivar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteSale(saleResponse)}
                                                    disabled={loading || deletingSaleId !== null}
                                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {formatDate(saleResponse.venta.fecha)}
                                        </p>
                                        {saleResponse.venta.cliente_nombre && (
                                            <p className="text-sm text-gray-600">
                                                Cliente: {saleResponse.venta.cliente_nombre}
                                            </p>
                                        )}
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-700">
                                                {saleResponse.items.length} producto(s)
                                            </p>
                                            <div className="text-xs text-gray-500">
                                                {saleResponse.items.map(item => (
                                                    <span key={item.id} className="mr-4">
                                                        {item.cantidad}x Item {item.producto_id}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-gray-900">
                                            ${saleResponse.venta.total.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>

                {/* View Mode Tabs */}
                <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                setViewMode('active');
                                setPage(0);
                                setSales([]);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                viewMode === 'active'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Activas
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('archived');
                                setPage(0);
                                setSales([]);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                viewMode === 'archived'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Archivadas
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('all');
                                setPage(0);
                                setSales([]);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                viewMode === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Todas
                        </button>
                    </div>
                </div>

                {hasMore && (
                    <div className="px-6 py-4 bg-gray-50 text-center">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Cargando...' : 'Cargar más'}
                        </button>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && saleToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <span className="text-red-600 text-2xl">⚠️</span>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Confirmar eliminación
                                </h3>
                            </div>
                            
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-800">
                                    Esta acción eliminará permanentemente la venta #{saleToDelete.venta.id} 
                                    y restaurará el inventario de {saleToDelete.items.length} producto(s).
                                </p>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    <strong>Fecha:</strong> {formatDate(saleToDelete.venta.fecha)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Total:</strong> ${saleToDelete.venta.total.toFixed(2)}
                                </p>
                                {saleToDelete.venta.cliente_nombre && (
                                    <p className="text-sm text-gray-600">
                                        <strong>Cliente:</strong> {saleToDelete.venta.cliente_nombre}
                                    </p>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={confirmDeleteSale}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {deletingSaleId === saleToDelete.venta.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                                <button
                                    onClick={cancelDelete}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Archive Confirmation Modal */}
                {showArchiveConfirm && saleToArchive && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <span className="text-orange-600 text-2xl">📦</span>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Confirmar archivado
                                </h3>
                            </div>
                            
                            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                                <p className="text-sm text-orange-800">
                                    Esta acción archivará la venta #{saleToArchive.venta.id} y la moverá 
                                    a la sección de ventas archivadas. Podrá desarchivarla en cualquier momento.
                                </p>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    <strong>Fecha:</strong> {formatDate(saleToArchive.venta.fecha)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Total:</strong> ${saleToArchive.venta.total.toFixed(2)}
                                </p>
                                {saleToArchive.venta.cliente_nombre && (
                                    <p className="text-sm text-gray-600">
                                        <strong>Cliente:</strong> {saleToArchive.venta.cliente_nombre}
                                    </p>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={confirmArchiveSale}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {archivingSaleId === saleToArchive.venta.id ? 'Archivando...' : 'Archivar'}
                                </button>
                                <button
                                    onClick={cancelArchive}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unarchive Confirmation Modal */}
                {showUnarchiveConfirm && saleToUnarchive && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <span className="text-green-600 text-2xl">🔄</span>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Confirmar desarchivado
                                </h3>
                            </div>
                            
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-800">
                                    Esta acción desarchivará la venta #{saleToUnarchive.venta.id} y la moverá 
                                    a la sección de ventas activas.
                                </p>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    <strong>Fecha:</strong> {formatDate(saleToUnarchive.venta.fecha)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Total:</strong> ${saleToUnarchive.venta.total.toFixed(2)}
                                </p>
                                {saleToUnarchive.venta.cliente_nombre && (
                                    <p className="text-sm text-gray-600">
                                        <strong>Cliente:</strong> {saleToUnarchive.venta.cliente_nombre}
                                    </p>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={confirmUnarchiveSale}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {unarchivingSaleId === saleToUnarchive.venta.id ? 'Desarchivando...' : 'Desarchivar'}
                                </button>
                                <button
                                    onClick={cancelUnarchive}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
