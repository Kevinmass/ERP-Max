import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Search, History, Folder, Wrench, Palette, Gauge, Settings as SettingsIcon } from 'lucide-react';
import { MODULES } from '../modules_config';
import type { ProductoResponse } from '../modules/catalogue/types';

// Subsections within a module that deep-link via ?tab= — surfaced separately
// so users don't have to know a module's internal tab structure to find them.
const SUBSECTIONS: { id: string; label: string; route: string; icon: PaletteItem['icon'] }[] = [
    { id: 'sales-history', label: 'Historial de Ventas', route: '/sales?tab=history', icon: History },
    { id: 'catalogue-categorias', label: 'Categorías', route: '/catalogue?tab=categorias', icon: Folder },
    { id: 'settings-general', label: 'Configuración General', route: '/settings?tab=general', icon: Wrench },
    { id: 'settings-appearance', label: 'Apariencia', route: '/settings?tab=appearance', icon: Palette },
    { id: 'settings-kpis', label: 'KPIs de Análisis', route: '/settings?tab=kpis', icon: Gauge },
    { id: 'settings-system', label: 'Sistema', route: '/settings?tab=system', icon: SettingsIcon },
];

interface PaletteItem {
    id: string;
    label: string;
    hint?: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    onSelect: () => void;
}

// Global Ctrl+K / Cmd+K command palette — the power-user spine (§4).
// Navigate to any module or jump straight to a product in Catálogo.
export default function CommandPalette() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [productResults, setProductResults] = useState<{ id: number; nombre: string }[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ctrl+K / Cmd+K toggles; Escape closes. Also listens for a custom event
    // so a visible header button can open it without prop-drilling state.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        const handleOpenEvent = () => setIsOpen(true);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-command-palette', handleOpenEvent);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-command-palette', handleOpenEvent);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setProductResults([]);
            setHighlighted(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    // Debounced product search once the query looks like a product name.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            setProductResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const response = await invoke<ProductoResponse>('get_productos', {
                    page: 1,
                    pageSize: 6,
                    searchQuery: query.trim(),
                    includeFotos: false,
                });
                setProductResults(response.data.map(p => ({ id: p.id, nombre: p.nombre })));
            } catch (error) {
                console.error('Error searching products for command palette:', error);
            }
        }, 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const close = useCallback(() => setIsOpen(false), []);

    const navItems: PaletteItem[] = MODULES
        .filter(m => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map(m => ({
            id: `nav-${m.id}`,
            label: m.name.charAt(0) + m.name.slice(1).toLowerCase(),
            hint: 'Ir a',
            icon: m.icon,
            onSelect: () => { navigate(m.route); close(); },
        }));

    const subsectionItems: PaletteItem[] = SUBSECTIONS
        .filter(s => !query.trim() || s.label.toLowerCase().includes(query.trim().toLowerCase()))
        .map(s => ({
            id: `sub-${s.id}`,
            label: s.label,
            hint: 'Ir a',
            icon: s.icon,
            onSelect: () => { navigate(s.route); close(); },
        }));

    const productItems: PaletteItem[] = productResults.map(p => ({
        id: `product-${p.id}`,
        label: p.nombre,
        hint: 'Buscar en Catálogo',
        icon: Search,
        onSelect: () => { navigate(`/catalogue?q=${encodeURIComponent(p.nombre)}`); close(); },
    }));

    const items = [...navItems, ...subsectionItems, ...productItems];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(prev => Math.min(prev + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            items[highlighted]?.onSelect();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 z-[1050] flex items-start justify-center pt-24"
            onClick={close}
        >
            <div
                className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.5} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ir a un módulo o buscar un producto..."
                        className="flex-1 outline-none text-sm"
                    />
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 rounded text-gray-500 shrink-0">Esc</kbd>
                </div>

                <div className="max-h-80 overflow-y-auto py-1">
                    {items.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            Sin resultados para "{query}"
                        </div>
                    )}
                    {items.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={item.onSelect}
                            onMouseEnter={() => setHighlighted(index)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                                index === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                        >
                            <item.icon className="w-4 h-4 text-gray-500 shrink-0" strokeWidth={1.5} />
                            <span className="flex-1 text-sm text-gray-900 truncate">{item.label}</span>
                            {item.hint && <span className="text-xs text-gray-400 shrink-0">{item.hint}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
