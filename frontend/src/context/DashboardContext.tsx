import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  DashboardResponse, 
  DashboardStats, 
  SalesTrend, 
  InventoryStatus, 
  KpiConfig,
  getDashboardData,
  getKpiConfig,
  updateKpiConfig
} from '../api/dashboard';

interface DashboardContextType {
  dashboardData: DashboardResponse | null;
  stats: DashboardStats | null;
  salesTrend: SalesTrend[];
  inventoryStatus: InventoryStatus[];
  kpiConfig: KpiConfig | null;
  isLoading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  updateKpiSettings: (config: Partial<KpiConfig>) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([]);
  const [kpiConfig, setKpiConfig] = useState<KpiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getDashboardData();
      setDashboardData(data);
      setStats(data.stats);
      setSalesTrend(data.sales_trend);
      setInventoryStatus(data.inventory_status);
      setKpiConfig(data.kpi_config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKpiConfig = async () => {
    try {
      const config = await getKpiConfig();
      setKpiConfig(config);
    } catch (err) {
      console.error('Error fetching KPI config:', err);
    }
  };

  const refreshDashboard = async () => {
    await fetchDashboardData();
  };

  const updateKpiSettings = async (configUpdate: Partial<KpiConfig>) => {
    if (!kpiConfig) return;
    
    const newConfig = { ...kpiConfig, ...configUpdate };
    try {
      await updateKpiConfig(newConfig);
      setKpiConfig(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update KPI settings');
      console.error('Error updating KPI settings:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchKpiConfig();
  }, []);

  const value: DashboardContextType = {
    dashboardData,
    stats,
    salesTrend,
    inventoryStatus,
    kpiConfig,
    isLoading,
    error,
    refreshDashboard,
    updateKpiSettings,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};