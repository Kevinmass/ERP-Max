import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, SettingsMap } from './types';
import { applyTheme, applyFontSize } from '../../utils/theme';
import { useDashboard } from '../../context/DashboardContext';

const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({
        company_name: '',
        business_address: '',
        business_city: '',
        business_phone: '',
        business_email: '',
        business_website: '',
        theme_name: 'blue',
        theme_variant: 'light',
        font_size: 'medium',
        language: 'en',
        tax_rate: 0,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'system'>('general');
    
    // Dashboard context for KPI settings
    const { kpiConfig, updateKpiSettings } = useDashboard();

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settingsMap: SettingsMap = await invoke('get_settings');
            setSettings({
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
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsMap: SettingsMap = {
                company_name: settings.company_name,
                business_address: settings.business_address || '',
                business_city: settings.business_city || '',
                business_phone: settings.business_phone || '',
                business_email: settings.business_email || '',
                business_website: settings.business_website || '',
                theme_name: settings.theme_name,
                theme_variant: settings.theme_variant,
                font_size: settings.font_size,
                language: settings.language,
                tax_rate: settings.tax_rate.toString(),
            };
            await invoke('save_settings', { settings: settingsMap });

            // Immediately apply theme and font size changes
            applyTheme(settings.theme_name, settings.theme_variant);
            applyFontSize(settings.font_size);

            alert('Configuración guardada y aplicada exitosamente!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof Settings, value: string | number) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // Handle KPI toggle changes
    const handleKpiToggle = async (kpiKey: string, newValue: boolean) => {
        if (kpiConfig) {
            const updateData: any = {};
            updateData[kpiKey] = newValue;
            await updateKpiSettings(updateData);
        }
    };

    const themePreviews = {
        blue: {
            light: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
            dark: 'bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700'
        },
        green: {
            light: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
            dark: 'bg-gradient-to-br from-green-900 to-green-800 border-green-700'
        },
        purple: {
            light: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
            dark: 'bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700'
        },
        professional: {
            light: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
            dark: 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="h-32 bg-gray-300 rounded-xl"></div>
                        <div className="h-32 bg-gray-300 rounded-xl"></div>
                        <div className="h-32 bg-gray-300 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Module Actions Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
                    <p className="text-gray-600 mt-1">
                        Personaliza tu experiencia y preferencias
                    </p>
                </div>
                
                <div className="flex items-center space-x-3">
                    <button
                        onClick={loadSettings}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                    >
                        <span>🔄</span>
                        <span>Recargar</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                    >
                        <span>💾</span>
                        <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'general'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        🔧 General
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'appearance'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        🎨 Apariencia
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'system'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        ⚙️ Sistema
                    </button>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de la Empresa
                                </label>
                                <input
                                    type="text"
                                    value={settings.company_name}
                                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Ingresa el nombre de tu empresa"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dirección de la Empresa
                                </label>
                                <input
                                    type="text"
                                    value={settings.business_address || ''}
                                    onChange={(e) => handleInputChange('business_address', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Calle y número"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ciudad/Población
                                </label>
                                <input
                                    type="text"
                                    value={settings.business_city || ''}
                                    onChange={(e) => handleInputChange('business_city', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Ciudad o localidad"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Idioma del Sistema
                                </label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => handleInputChange('language', e.target.value as 'en' | 'es')}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="en">English (Inglés)</option>
                                    <option value="es">Español (Spanish)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tasa de Impuestos (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={settings.tax_rate}
                                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">Esta tasa se aplicará a todas las ventas</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalización Visual</h3>
                            <p className="text-gray-600 mb-6">Elige el tema y apariencia de tu interfaz</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tema Principal
                                    </label>
                                    <select
                                        value={settings.theme_name}
                                        onChange={(e) => handleInputChange('theme_name', e.target.value as 'blue' | 'green' | 'purple' | 'professional')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                        <option value="blue">🔵 Azul Clásico</option>
                                        <option value="green">🟢 Verde Natural</option>
                                        <option value="purple">🟣 Púrpura Moderno</option>
                                        <option value="professional">⚫ Profesional</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Variante del Tema
                                    </label>
                                    <select
                                        value={settings.theme_variant}
                                        onChange={(e) => handleInputChange('theme_variant', e.target.value as 'light' | 'dark')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                        <option value="light">☀️ Claro</option>
                                        <option value="dark">🌙 Oscuro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tamaño de Fuente
                                    </label>
                                    <select
                                        value={settings.font_size}
                                        onChange={(e) => handleInputChange('font_size', e.target.value as 'small' | 'medium' | 'large')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                        <option value="small">A (Pequeño)</option>
                                        <option value="medium">A (Mediano)</option>
                                        <option value="large">A (Grande)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">KPIs del Dashboard</h3>
                            <p className="text-gray-600 mb-6">Selecciona qué métricas deseas ver en tu panel principal</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Productos Totales
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra el número total de productos activos</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">📦</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_total_products', !kpiConfig?.show_total_products)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_total_products ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_total_products ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ventas de Hoy
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra el total de ventas generadas hoy</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">💰</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_today_sales', !kpiConfig?.show_today_sales)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_today_sales ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_today_sales ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Productos con Baja Existencia
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra productos que están por debajo del stock mínimo</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">⚠️</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_low_stock', !kpiConfig?.show_low_stock)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_low_stock ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_low_stock ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Categorías Activas
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra el número total de categorías</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">📚</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_active_categories', !kpiConfig?.show_active_categories)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_active_categories ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_active_categories ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ingresos Totales
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra el total de ingresos acumulados</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">💼</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_total_revenue', !kpiConfig?.show_total_revenue)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_total_revenue ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_total_revenue ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Total de Ventas
                                        </label>
                                        <p className="text-xs text-gray-500">Muestra el número total de transacciones</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">📈</span>
                                        <button 
                                            onClick={() => handleKpiToggle('show_sales_count', !kpiConfig?.show_sales_count)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                kpiConfig?.show_sales_count ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span 
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    kpiConfig?.show_sales_count ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            ></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa del Tema</h3>
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-lg border-2 ${themePreviews[settings.theme_name][settings.theme_variant]} transition-all duration-300`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Encabezado</span>
                                            <span className="text-xs text-gray-500">H1</span>
                                        </div>
                                        <div className="h-2 bg-gray-300 rounded mb-2"></div>
                                        <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                                    </div>
                                    
                                    <div className={`p-4 rounded-lg border-2 ${themePreviews[settings.theme_name][settings.theme_variant]} transition-all duration-300`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Botón</span>
                                            <span className="text-xs text-gray-500">Primary</span>
                                        </div>
                                        <div className="h-8 bg-blue-500 rounded-lg"></div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 text-center text-sm text-gray-600">
                                    Vista previa en tiempo real del tema seleccionado
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Versión del Sistema</p>
                                            <p className="text-lg font-bold text-gray-900">1.0.0</p>
                                        </div>
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-600">📋</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Estado de la Base de Datos</p>
                                            <p className="text-lg font-bold text-green-600">✅ Conectada</p>
                                        </div>
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <span className="text-green-600">💾</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Última Actualización</p>
                                            <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                                        </div>
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <span className="text-purple-600">⏰</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones del Sistema</h3>
                            <div className="space-y-4">
                                <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-between">
                                    <span>🔄 Reiniciar Aplicación</span>
                                    <span className="text-sm opacity-80">Requiere reinicio</span>
                                </button>
                                
                                <button className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between">
                                    <span>📊 Exportar Datos</span>
                                    <span className="text-sm opacity-80">CSV, JSON, Excel</span>
                                </button>
                                
                                <button className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-between">
                                    <span>⚠️ Restablecer Configuración</span>
                                    <span className="text-sm opacity-80">Cuidado</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
