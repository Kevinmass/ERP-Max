import { ReactNode, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SettingsMap } from '../modules/settings/types';
import { applyTheme, applyFontSize } from '../utils/theme';
// We don't need useLayout anymore for the layout container logic!
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import StatusBar from './StatusBar';
import { useLayout } from '../context/LayoutContext';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    useLayout();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Apply theme and font size on app startup
    useEffect(() => {
        const applySettings = async () => {
            try {
                const settings: SettingsMap = await invoke('get_settings');
                // Added 'as any' to bypass strict type checks on incoming rust data if needed
                const themeName = (settings.theme_name as any) || 'blue';
                const themeVariant = (settings.theme_variant as any) || 'light';
                const fontSize = (settings.font_size as any) || 'medium';

                applyTheme(themeName, themeVariant);
                applyFontSize(fontSize);
            } catch (error) {
                console.error('Failed to load theme/font settings:', error);
            }
        };
        applySettings();
    }, []);

    const handleMobileMenuToggle = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };


    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            {/* Sidebar handles its own width and collapsing logic */}
            <Sidebar />

            <div 
                className="flex-1 flex flex-col h-full overflow-hidden relative"
            >
                <Header
                    onMobileMenuToggle={handleMobileMenuToggle}
                    isMobileMenuOpen={isMobileMenuOpen}
                />

                <div className="px-6 pt-4">
                    <Breadcrumb />
                </div>

                <main 
                    className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8"
                    style={{ backgroundColor: 'var(--color-surface-50)' }}
                >
                    <div className="max-w-7xl mx-auto pb-10">
                        {children}
                    </div>
                </main>

                <StatusBar />
            </div>
        </div>
    );
}