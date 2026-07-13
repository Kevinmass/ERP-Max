import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import {
  getImportaciones,
  getResultadosMatching,
  getMatchingStats,
  getProductosInternos,
  confirmarMatch,
  rechazarMatch,
  importarYMatchear,
  aplicarActualizacionPrecios,
  exportarResultadosExcel,
  reimportarPreciosExcel,
  Importacion,
  MatchingResultado,
  MatchingStats,
  ProductoInterno,
  ActualizacionPreciosResult,
  ReimportarPreciosResult,
  formatDate,
  getImportStatusBadge,
  getMatchStatusBadge,
  formatScore,
  formatPrice,
} from '../api/matching';

type TabType = 'imports' | 'results';
type FilterStatus = 'all' | 'pendiente' | 'confirmado' | 'rechazado' | 'sin_match';

export default function ProductMatching() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('imports');
  const [importaciones, setImportaciones] = useState<Importacion[]>([]);
  // 0 = first 5 shown ("Ver más"), 1 = first 15 shown ("Ver todas"), 2 = all shown
  const [importExpandStage, setImportExpandStage] = useState<0 | 1 | 2>(0);
  const [selectedImport, setSelectedImport] = useState<Importacion | null>(null);
  const [resultados, setResultados] = useState<MatchingResultado[]>([]);
  const [filteredResultados, setFilteredResultados] = useState<MatchingResultado[]>([]);
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [thresholdAutomatico, setThresholdAutomatico] = useState(0.85);
  const [thresholdRevision, setThresholdRevision] = useState(0.60);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reimportFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modal state for product selection
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedResultado, setSelectedResultado] = useState<MatchingResultado | null>(null);
  const [productosInternos, setProductosInternos] = useState<ProductoInterno[]>([]);

  // Load importaciones on mount
  const loadImportaciones = useCallback(async () => {
    try {
      const data = await getImportaciones();
      setImportaciones(data);
      setImportExpandStage(0);
    } catch (err) {
      console.error('Error loading importaciones:', err);
      setError('Error al cargar importaciones');
    }
  }, []);

  useEffect(() => {
    loadImportaciones();
  }, [loadImportaciones]);

  // Load results when import is selected
  const loadResultados = useCallback(async (importId: number) => {
    try {
      const [resultadosData, statsData] = await Promise.all([
        getResultadosMatching(importId),
        getMatchingStats(importId),
      ]);
      setResultados(resultadosData);
      setFilteredResultados(resultadosData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading resultados:', err);
      setError('Error al cargar resultados');
    }
  }, []);

  // Filter results when filter state changes
  useEffect(() => {
    let filtered = [...resultados];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.estado === filterStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.producto_proveedor_nombre.toLowerCase().includes(query) ||
        r.producto_interno_nombre?.toLowerCase().includes(query)
      );
    }
    
    setFilteredResultados(filtered);
  }, [resultados, filterStatus, searchQuery]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // Handle file import
  const handleImport = async () => {
    if (!proveedorNombre.trim()) {
      setError('Por favor ingrese el nombre del proveedor');
      return;
    }

    if (!selectedFile) {
      setError('Por favor seleccione un archivo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Read file as array of bytes
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));

      // Get filename
      const nombreArchivo = selectedFile.name;

      // Execute import and matching
      const importacion = await importarYMatchear(
        proveedorNombre,
        bytes,
        nombreArchivo,
        thresholdAutomatico,
        thresholdRevision
      );

      // Reload data
      await loadImportaciones();
      setSelectedImport(importacion);
      await loadResultados(importacion.id!);
      setActiveTab('results');

      // Reset form
      setProveedorNombre('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess(`Se importaron ${importacion.total_productos} productos`);
    } catch (err) {
      console.error('Error importing:', err);
      setError(`Error al importar: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle select import
  const handleSelectImport = async (importacion: Importacion) => {
    setSelectedImport(importacion);
    if (importacion.id) {
      await loadResultados(importacion.id);
    }
    setActiveTab('results');
  };

  // Handle confirm match
  const handleConfirmMatch = async (resultadoId: number, productoInternoId: number) => {
    try {
      setLoading(true);
      await confirmarMatch(resultadoId, productoInternoId);
      if (selectedImport?.id) {
        await loadResultados(selectedImport.id);
      }
      setSuccess('Match confirmado correctamente');
    } catch (err) {
      console.error('Error confirming match:', err);
      setError('Error al confirmar match');
    } finally {
      setLoading(false);
    }
  };

  // Handle reject match
  const handleRejectMatch = async (resultadoId: number) => {
    try {
      setLoading(true);
      await rechazarMatch(resultadoId);
      if (selectedImport?.id) {
        await loadResultados(selectedImport.id);
      }
      setSuccess('Match rechazado');
    } catch (err) {
      console.error('Error rejecting match:', err);
      setError('Error al rechazar match');
    } finally {
      setLoading(false);
    }
  };

  // Handle apply price updates
  const handleApplyPriceUpdates = async () => {
    if (!selectedImport?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const result: ActualizacionPreciosResult = await aplicarActualizacionPrecios(selectedImport.id);
      
      if (result.errores.length > 0) {
        setError(`Se actualizaron ${result.actualizados} costos. Errores: ${result.errores.join(', ')}`);
      } else {
        setSuccess(`Se actualizaron ${result.actualizados} costos correctamente`);
      }
    } catch (err) {
      console.error('Error applying price updates:', err);
      setError(`Error al aplicar costos: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle export to Excel
  const handleExportExcel = async () => {
    if (!selectedImport?.id) return;
    
    try {
      setLoading(true);
      const bytes: number[] = await exportarResultadosExcel(selectedImport.id);
      
      // Convert to blob and download
      const uint8Array = new Uint8Array(bytes);
      const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultados_matching_${selectedImport.proveedor_nombre}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('Excel exportado correctamente');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setError(`Error al exportar Excel: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle reimport Excel
  const handleReimportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedImport?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      
      const result: ReimportarPreciosResult = await reimportarPreciosExcel(
        selectedImport.id,
        bytes,
        file.name
      );
      
      if (result.errores.length > 0) {
        setError(`Se actualizaron ${result.actualizados} costos. Errores: ${result.errores.join(', ')}`);
      } else {
        setSuccess(`Se procesaron ${result.totalProcesados} productos y se actualizaron ${result.actualizados} costos`);
      }
      
      // Reload results
      await loadResultados(selectedImport.id);
    } catch (err) {
      console.error('Error reimporting Excel:', err);
      setError(`Error al reimportar Excel: ${err}`);
    } finally {
      setLoading(false);
      if (reimportFileInputRef.current) {
        reimportFileInputRef.current.value = '';
      }
    }
  };

  // Open product selection modal
  const handleOpenProductModal = async (resultado: MatchingResultado) => {
    setSelectedResultado(resultado);
    try {
      const products = await getProductosInternos();
      setProductosInternos(products);
      setShowProductModal(true);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
    }
  };

  // Handle select product from modal
  const handleSelectProduct = async (producto: ProductoInterno) => {
    if (!selectedResultado?.id) return;
    
    try {
      setLoading(true);
      await confirmarMatch(selectedResultado.id, producto.id);
      if (selectedImport?.id) {
        await loadResultados(selectedImport.id);
      }
      setShowProductModal(false);
      setSelectedResultado(null);
      setSuccess('Producto seleccionado correctamente');
    } catch (err) {
      console.error('Error selecting product:', err);
      setError('Error al seleccionar producto');
    } finally {
      setLoading(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-gray-600 mt-1">
          Empareja listas de costos de proveedores con tu catálogo interno
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Import Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Importar Lista de Proveedor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Provider Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Proveedor
            </label>
            <input
              type="text"
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              placeholder="ej. Proveedor ABC"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Threshold Automatic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Umbral Automático ({Math.round(thresholdAutomatico * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={thresholdAutomatico}
              onChange={(e) => setThresholdAutomatico(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Por encima de este valor se confirma automáticamente
            </p>
          </div>

          {/* Threshold Revision */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Umbral Revisión ({Math.round(thresholdRevision * 100)}%)
            </label>
            <input
              type="range"
              min="0.3"
              max="0.85"
              step="0.05"
              value={thresholdRevision}
              onChange={(e) => setThresholdRevision(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Por encima de este valor requiere revisión manual
            </p>
          </div>
        </div>

        {/* File Input and Import Button */}
        <div className="mt-4 flex items-center justify-between">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* File selection button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {selectedFile ? selectedFile.name : 'Seleccionar Archivo (CSV o Excel)'}
          </button>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={loading || !proveedorNombre.trim() || !selectedFile}
            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              loading || !proveedorNombre.trim() || !selectedFile
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              'Importar y Emparejar'
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('imports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'imports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Importaciones
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Resultados
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'imports' ? (
        /* Imports List */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emparejados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {importaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay importaciones aún. Importa una lista de proveedor para comenzar.
                  </td>
                </tr>
              ) : (
                importaciones
                  .slice(0, importExpandStage === 0 ? 5 : importExpandStage === 1 ? 15 : undefined)
                  .map((imp) => (
                  <tr
                    key={imp.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedImport?.id === imp.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectImport(imp)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(imp.fecha_importacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {imp.proveedor_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {imp.archivo_original}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {imp.total_productos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {imp.productos_emparajados}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getImportStatusBadge(imp.estado)}`}>
                        {imp.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectImport(imp);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Resultados
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {importExpandStage < 2 && importaciones.length > (importExpandStage === 0 ? 5 : 15) && (
            <div className="px-6 py-3 border-t border-gray-200 text-center">
              <button
                onClick={() => setImportExpandStage(prev => prev === 0 ? 1 : 2)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {importExpandStage === 0 ? 'Ver más' : 'Ver todas'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results */
        <div>
          {!selectedImport ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Selecciona una importación para ver los resultados
              </p>
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Apply prices button */}
                <button
                  onClick={handleApplyPriceUpdates}
                  disabled={loading || (stats?.confirmados || 0) === 0}
                  className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    loading || (stats?.confirmados || 0) === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Aplicar Costos ({stats?.confirmados || 0} confirmados)
                </button>

                {/* Export Excel button */}
                <button
                  onClick={handleExportExcel}
                  disabled={loading || resultados.length === 0}
                  className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    loading || resultados.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Exportar Excel
                </button>

                {/* Reimport button */}
                <div className="relative">
                  <input
                    ref={reimportFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleReimportExcel}
                    className="hidden"
                  />
                  <button
                    onClick={() => reimportFileInputRef.current?.click()}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    Reimportar Costos
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.automaticos}</div>
                    <div className="text-sm text-gray-500">Automáticos</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.confirmados}</div>
                    <div className="text-sm text-gray-500">Confirmados</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
                    <div className="text-sm text-gray-500">Pendientes</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.rechazados}</div>
                    <div className="text-sm text-gray-500">Rechazados</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-600">{stats.sin_match}</div>
                    <div className="text-sm text-gray-500">Sin Match</div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                {/* Status filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Estado:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="rechazado">Rechazados</option>
                    <option value="sin_match">Sin Match</option>
                  </select>
                </div>

                {/* Search */}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="text-sm text-gray-500 self-center">
                  {filteredResultados.length} de {resultados.length} resultados
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto Proveedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Costo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto Interno
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Similitud
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResultados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No hay resultados para esta importación
                        </td>
                      </tr>
                    ) : (
                      filteredResultados.map((resultado) => (
                        <tr key={resultado.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {resultado.producto_proveedor_nombre}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatPrice(resultado.producto_proveedor_precio)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {resultado.producto_interno_nombre || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    resultado.score_similitud >= 0.85
                                      ? 'bg-green-500'
                                      : resultado.score_similitud >= 0.6
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${resultado.score_similitud * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-gray-600">
                                {formatScore(resultado.score_similitud)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMatchStatusBadge(resultado.estado)}`}>
                              {resultado.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {resultado.estado === 'pendiente' && (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenProductModal(resultado)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Elegir
                                </button>
                                <button
                                  onClick={() =>
                                    handleConfirmMatch(
                                      resultado.id!,
                                      resultado.producto_interno_id!
                                    )
                                  }
                                  disabled={loading || !resultado.producto_interno_id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => handleRejectMatch(resultado.id!)}
                                  disabled={loading}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Seleccionar Producto</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                onChange={(e) => {
                  const query = e.target.value.toLowerCase();
                  const filtered = productosInternos.filter(p => 
                    p.nombre.toLowerCase().includes(query)
                  );
                  setProductosInternos(query ? filtered : productosInternos);
                }}
              />
              <div className="space-y-2">
                {productosInternos.map((producto) => (
                  <button
                    key={producto.id}
                    onClick={() => handleSelectProduct(producto)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium">{producto.nombre}</div>
                    <div className="text-sm text-gray-500">
                      Precio actual: {formatPrice(producto.costo)} | Stock: {producto.stock}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
