import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LayoutProvider } from './context/LayoutContext';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Catalogue from './components/Catalogue';
import Categories from './components/Categories';
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
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/catalogue" element={<Catalogue />} />
                        <Route path="/categorias" element={<Categories />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/stock" element={<StockDashboard />} />
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
                    <Router>
                        <AppContent />
                    </Router>
                </LayoutProvider>
            </DashboardProvider>
        </AuthProvider>
    );
}

export default App;