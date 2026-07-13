import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLayout } from '../context/LayoutContext';
import { SettingsMap } from '../modules/settings/types';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toggleSidebar } = useLayout();
    const [companyName, setCompanyName] = useState('ERP System');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    // Load company name from settings
    useEffect(() => {
        const loadCompanyName = async () => {
            try {
                const settings: SettingsMap = await invoke('get_settings');
                if (settings.company_name) {
                    setCompanyName(settings.company_name);
                }
            } catch (error) {
                console.error('Failed to load company name:', error);
            }
        };
        loadCompanyName();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const handleHomeClick = () => {
        navigate('/');
    };

    return (
        <>
            {/* Main Header */}
            <header 
                className="border-b shadow-sm sticky top-0 z-40"
                style={{ 
                    backgroundColor: 'var(--color-surface-100)',
                    borderColor: 'var(--color-surface-200)'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left Section: Sidebar Toggle & Logo */}
                        <div className="flex items-center space-x-4">
                            {/* Sidebar Toggle Button */}
                            <button
                                onClick={toggleSidebar}
                                className="lg:hidden p-2 rounded-lg transition-colors"
                                style={{ 
                                    color: 'var(--color-neutral-600)',
                                }}
                                aria-label="Toggle sidebar"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Logo & Company */}
                            <button
                                onClick={handleHomeClick}
                                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                            >
                                {/* Taller mark: graphite plate, amber initial — industrial signage */}
                                <div
                                    className="w-9 h-9 rounded flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--color-neutral-900)' }}
                                >
                                    <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                                        {companyName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="hidden md:block text-left">
                                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                                        {companyName}
                                    </h1>
                                </div>
                            </button>
                        </div>

                        {/* Center Section: Breadcrumb or Title */}
                        <div className="hidden lg:flex items-center space-x-4 flex-1 justify-center">
                            <div className="text-center">
                                <h2 
                                    className="text-lg font-semibold"
                                    style={{ color: 'var(--color-neutral-900)' }}
                                >
                                    {location.pathname === '/' && 'Hoy'}
                                    {location.pathname === '/catalogue' && 'CATALOGO'}
                                    {location.pathname === '/sales' && 'VENTAS'}
                                    {location.pathname === '/stock' && 'INVENTARIO'}
                                    {location.pathname === '/analisis' && 'ANALISIS'}
                                    {location.pathname === '/matching' && 'PROVEEDORES'}
                                    {location.pathname === '/settings' && 'CONFIGURACION'}
                                </h2>
                                <p 
                                    className="text-sm"
                                    style={{ color: 'var(--color-neutral-600)' }}
                                >
                                    {formatDate(currentTime)} • {formatTime(currentTime)}
                                </p>
                            </div>
                        </div>

                        {/* Right Section: Actions & Time */}
                        <div className="flex items-center space-x-4">
                            {/* Command palette trigger */}
                            <button
                                onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                                style={{ borderColor: 'var(--color-surface-300)', color: 'var(--color-neutral-500)' }}
                                title="Buscar (Ctrl+K)"
                            >
                                <Search className="w-4 h-4" strokeWidth={1.5} />
                                <span className="hidden md:inline">Buscar</span>
                                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 rounded">Ctrl+K</kbd>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
