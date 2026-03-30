import { invoke } from '@tauri-apps/api/core';

// Types for dashboard data
export interface DashboardStats {
  total_products: number;
  today_sales: number;
  low_stock_items: number;
  active_categories: number;
  total_revenue: number;
  sales_count: number;
}

export interface SalesTrend {
  date: string;
  total: number;
  count: number;
}

export interface InventoryStatus {
  status: string;
  count: number;
}

export interface KpiConfig {
  show_total_products: boolean;
  show_today_sales: boolean;
  show_low_stock: boolean;
  show_active_categories: boolean;
  show_total_revenue: boolean;
  show_sales_count: boolean;
}

export interface DashboardResponse {
  stats: DashboardStats;
  sales_trend: SalesTrend[];
  inventory_status: InventoryStatus[];
  kpi_config: KpiConfig;
}

// API functions
export const getDashboardData = async (): Promise<DashboardResponse> => {
  return await invoke<DashboardResponse>('get_dashboard_data');
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return await invoke<DashboardStats>('get_dashboard_stats');
};

export const getSalesTrend = async (days: number): Promise<SalesTrend[]> => {
  return await invoke<SalesTrend[]>('get_sales_trend', { days });
};

export const getInventoryStatus = async (): Promise<InventoryStatus[]> => {
  return await invoke<InventoryStatus[]>('get_inventory_status');
};

export const getKpiConfig = async (): Promise<KpiConfig> => {
  return await invoke<KpiConfig>('get_kpi_config');
};

export const updateKpiConfig = async (config: KpiConfig): Promise<void> => {
  return await invoke<void>('update_kpi_config', { config });
};