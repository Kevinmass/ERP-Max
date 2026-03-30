import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useLayout } from '../context/LayoutContext';
import { useAuth } from '../context/AuthContext';
import { SettingsMap } from '../modules/settings/types';

interface HeaderProps {
    onMobileMenuToggle?: () => void;
    isMobileMenuOpen?: boolean;
}

export default function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { toggleSidebar } = useLayout();
    const { user } = useAuth();
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
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-white font-bold text-lg">E</span>
                                </div>
                                <div className="hidden md:block">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        {companyName}
                                    </h1>
                                    <p 
                                        className="text-xs"
                                        style={{ color: 'var(--color-neutral-600)' }}
                                    >
                                        Enterprise Resource Planning
                                    </p>
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
                                    {location.pathname === '/' && 'Dashboard'}
                                    {location.pathname === '/catalogue' && 'CATALOGO'}
                                    {location.pathname === '/sales' && 'VENTAS'}
                                    {location.pathname === '/stock' && 'INVENTARIO'}
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
                            {/* Quick Actions */}
                            <div className="hidden sm:flex items-center space-x-2">
                                <Link
                                    to="/catalogue"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ 
                                        color: 'var(--color-neutral-600)',
                                    }}
                                    title="Add Product"
                                >
                                    <span className="text-lg">➕</span>
                                </Link>
                                <Link
                                    to="/sales"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ 
                                        color: 'var(--color-neutral-600)',
                                    }}
                                    title="New Sale"
                                >
                                    <span className="text-lg">💰</span>
                                </Link>
                                <Link
                                    to="/stock"
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ 
                                        color: 'var(--color-neutral-600)',
                                    }}
                                    title="Check Inventory"
                                >
                                    <span className="text-lg">📦</span>
                                </Link>
                            </div>

                            {/* Time Display */}
                            <div className="text-right">
                                <p 
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--color-neutral-900)' }}
                                >
                                    {formatTime(currentTime)}
                                </p>
                                <p 
                                    className="text-xs"
                                    style={{ color: 'var(--color-neutral-600)' }}
                                >
                                    {formatDate(currentTime)}
                                </p>
                            </div>

                            {/* User Avatar */}
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:scale-105 transition-transform">
                                {user ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div 
                    className="md:hidden border-b shadow-lg"
                    style={{ 
                        backgroundColor: 'var(--color-surface-100)',
                        borderColor: 'var(--color-surface-200)'
                    }}
                >
                    <div className="px-4 py-3 space-y-1">
                        <div 
                            className="px-3 py-2 text-sm font-medium border-b"
                            style={{ 
                                color: 'var(--color-neutral-500)',
                                borderColor: 'var(--color-surface-200)'
                            }}
                        >
                            Quick Actions
                        </div>
                        <Link
                            to="/catalogue"
                            onClick={onMobileMenuToggle}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors"
                            style={{ color: 'var(--color-neutral-700)' }}
                        >
                            <span className="text-lg">➕</span>
                            <span>Add Product</span>
                        </Link>
                        <Link
                            to="/sales"
                            onClick={onMobileMenuToggle}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors"
                            style={{ color: 'var(--color-neutral-700)' }}
                        >
                            <span className="text-lg">💰</span>
                            <span>New Sale</span>
                        </Link>
                        <Link
                            to="/stock"
                            onClick={onMobileMenuToggle}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors"
                            style={{ color: 'var(--color-neutral-700)' }}
                        >
                            <span className="text-lg">📦</span>
                            <span>Check Inventory</span>
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
