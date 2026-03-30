import { invoke } from '@tauri-apps/api/core';

// ==================== Types ====================

export interface ProductoProveedor {
  nombre: string;
  precio: number | null;
  codigo: string | null;
  cantidad: number | null;
}

export interface ProductoInterno {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  stock: number;
  categoria_id: number | null;
  tags: string | null;
}

export interface MatchingResultado {
  id: number | null;
  importacion_id: number;
  producto_proveedor_nombre: string;
  producto_proveedor_precio: number | null;
  producto_interno_id: number | null;
  producto_interno_nombre: string | null;
  score_similitud: number;
  estado: 'pendiente' | 'confirmado' | 'rechazado' | 'sin_match';
}

export interface Importacion {
  id: number | null;
  proveedor_nombre: string;
  archivo_original: string;
  fecha_importacion: string;
  estado: 'pendiente' | 'procesando' | 'completada' | 'error';
  total_productos: number;
  productos_emparajados: number;
}

export interface MatchingStats {
  total: number;
  automaticos: number;
  pendientes: number;
  confirmados: number;
  rechazados: number;
  sin_match: number;
}

export interface ActualizacionPreciosResult {
  totalConfirmados: number;
  actualizados: number;
  errores: string[];
}

export interface ReimportarPreciosResult {
  totalProcesados: number;
  actualizados: number;
  errores: string[];
}

// ==================== API Functions ====================

/**
 * Import a supplier price list file and create initial import record
 */
export const importarListaProveedor = async (
  proveedorNombre: string,
  archivoContenido: number[],
  nombreArchivo: string
): Promise<Importacion> => {
  return await invoke<Importacion>('importar_lista_proveedor', {
    proveedorNombre,
    archivoContenido,
    nombreArchivo,
  });
};

/**
 * Execute the matching algorithm for an import
 */
export const ejecutarMatching = async (
  importacionId: number,
  thresholdAutomatico?: number,
  thresholdRevision?: number
): Promise<MatchingStats> => {
  return await invoke<MatchingStats>('ejecutar_matching', {
    importacionId,
    thresholdAutomatico: thresholdAutomatico ?? null,
    thresholdRevision: thresholdRevision ?? null,
  });
};

/**
 * Get all imports
 */
export const getImportaciones = async (): Promise<Importacion[]> => {
  return await invoke<Importacion[]>('get_importaciones');
};

/**
 * Get results for an import
 */
export const getResultadosMatching = async (
  importacionId: number
): Promise<MatchingResultado[]> => {
  return await invoke<MatchingResultado[]>('get_resultados_matching', {
    importacionId,
  });
};

/**
 * Confirm a match manually
 */
export const confirmarMatch = async (
  resultadoId: number,
  productoInternoId: number
): Promise<void> => {
  return await invoke<void>('confirmar_match', {
    resultadoId,
    productoInternoId,
  });
};

/**
 * Reject a match
 */
export const rechazarMatch = async (resultadoId: number): Promise<void> => {
  return await invoke<void>('rechazar_match', { resultadoId });
};

/**
 * Get matching statistics
 */
export const getMatchingStats = async (
  importacionId: number
): Promise<MatchingStats> => {
  return await invoke<MatchingStats>('get_matching_stats', { importacionId });
};

/**
 * Execute matching with full pipeline (parse + match + save)
 */
export const importarYMatchear = async (
  proveedorNombre: string,
  archivoContenido: number[],
  nombreArchivo: string,
  thresholdAutomatico?: number,
  thresholdRevision?: number
): Promise<Importacion> => {
  return await invoke<Importacion>('importar_y_matchear', {
    proveedorNombre,
    archivoContenido,
    nombreArchivo,
    thresholdAutomatico: thresholdAutomatico ?? null,
    thresholdRevision: thresholdRevision ?? null,
  });
};

/**
 * Get all internal products from catalogue for manual selection
 */
export const getProductosInternos = async (): Promise<ProductoInterno[]> => {
  return await invoke<ProductoInterno[]>('get_productos_internos');
};

/**
 * Apply price updates to catalogue for confirmed matches
 */
export const aplicarActualizacionPrecios = async (
  importacionId: number
): Promise<ActualizacionPreciosResult> => {
  return await invoke<ActualizacionPreciosResult>('aplicar_actualizacion_precios', {
    importacionId,
  });
};

/**
 * Export results to Excel file
 */
export const exportarResultadosExcel = async (
  importacionId: number
): Promise<number[]> => {
  return await invoke<number[]>('exportar_resultados_excel', {
    importacionId,
  });
};

/**
 * Reimport prices from modified Excel file
 */
export const reimportarPreciosExcel = async (
  importacionId: number,
  archivoContenido: number[],
  nombreArchivo: string
): Promise<ReimportarPreciosResult> => {
  return await invoke<ReimportarPreciosResult>('reimportar_precios_excel', {
    importacionId,
    archivoContenido,
    nombreArchivo,
  });
};

// ==================== Helper Functions ====================

/**
 * Format a date string for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get status badge class based on import status
 */
export const getImportStatusBadge = (estado: Importacion['estado']): string => {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800';
    case 'procesando':
      return 'bg-blue-100 text-blue-800';
    case 'completada':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get status badge class based on matching status
 */
export const getMatchStatusBadge = (
  estado: MatchingResultado['estado']
): string => {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmado':
      return 'bg-green-100 text-green-800';
    case 'rechazado':
      return 'bg-red-100 text-red-800';
    case 'sin_match':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Format score as percentage
 */
export const formatScore = (score: number): string => {
  return `${(score * 100).toFixed(1)}%`;
};

/**
 * Format price
 */
export const formatPrice = (price: number | null): string => {
  if (price === null) return '-';
  return `$${price.toFixed(2)}`;
};
