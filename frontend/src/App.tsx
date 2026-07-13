import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LayoutProvider } from './context/LayoutContext';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Hoy from './components/Hoy';
import Analisis from './components/Analisis';
import Catalogue from './components/Catalogue';
import Sales from './components/Sales';
import StockDashboard from './modules/stock/StockDashboard';
import SettingsView from './modules/settings/SettingsView';
import ProductMatching from './components/ProductMatching';

function AppContent() {
    return (
        <Routes>
            <Route path="/*" element={
                <Layout>
                    <Routes>
                        <Route path="/" element={<Hoy />} />
                        <Route path="/catalogue" element={<Catalogue />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/stock" element={<StockDashboard />} />
                        <Route path="/analisis" element={<Analisis />} />
                        <Route path="/settings" element={<SettingsView />} />
                        <Route path="/matching" element={<ProductMatching />} />
                    </Routes>
                </Layout>
            } />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <DashboardProvider>
                <LayoutProvider>
                    <ToastProvider>
                        <Router>
                            <AppContent />
                        </Router>
                    </ToastProvider>
                </LayoutProvider>
            </DashboardProvider>
        </AuthProvider>
    );
}

export default App;