import { invoke } from '@tauri-apps/api/core';

// ==================== Types ====================

export interface ReimportarPreciosResult {
  totalProcesados: number;
  actualizados: number;
  errores: string[];
}

// ==================== API Functions ====================

/**
 * Export catalogue to Excel format (CSV compatible with Excel)
 * This file can be reimported to update prices
 */
export const exportarCatalogoExcel = async (): Promise<number[]> => {
  return await invoke<number[]>('exportar_catalogo_excel');
};

/**
 * Export catalogue to PDF format
 */
export const exportarCatalogoPdf = async (): Promise<number[]> => {
  return await invoke<number[]>('exportar_catalogo_pdf');
};

/**
 * Reimport prices from Excel file
 * The Excel must have columns: Nombre, Precio
 */
export const reimportarPreciosCatalogo = async (
  archivoContenido: number[],
  nombreArchivo: string
): Promise<ReimportarPreciosResult> => {
  return await invoke<ReimportarPreciosResult>('reimportar_precios_catalogo', {
    archivoContenido,
    nombreArchivo,
  });
};

// ==================== Helper Functions ====================

/**
 * Download a byte array as a file
 */
export const downloadBlob = (data: number[], filename: string, mimeType: string): void => {
  const uint8Array = new Uint8Array(data);
  const blob = new Blob([uint8Array], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export catalogue to Excel and trigger download
 */
export const exportCatalogueToExcel = async (): Promise<void> => {
  try {
    const data = await exportarCatalogoExcel();
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadBlob(data, `catalogo-productos-${timestamp}.csv`, 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Export catalogue to PDF and trigger download
 */
export const exportCatalogueToPdf = async (): Promise<void> => {
  try {
    const data = await exportarCatalogoPdf();
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadBlob(data, `catalogo-productos-${timestamp}.pdf`, 'application/pdf');
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};
