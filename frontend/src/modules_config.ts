import { Sun, CircleDollarSign, BookOpen, Package, BarChart3, Link2, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ModuleGroup = 'operacion' | 'gestion';

export const GROUP_LABELS: Record<ModuleGroup, string> = {
    operacion: 'Operación',
    gestion: 'Gestión',
};

export interface ModuleConfig {
    id: string;
    name: string;
    route: string;
    icon: LucideIcon;
    group: ModuleGroup;
    description?: string;
    requiredRole?: string; // 'administrador' or undefined for all users
}

// Order matters: rendered in this sequence within each group (§6 nav rework).
export const MODULES: ModuleConfig[] = [
    {
        id: 'hoy',
        name: 'HOY',
        route: '/',
        icon: Sun,
        group: 'operacion',
        description: 'Inicio del día: accesos rápidos y atención',
        requiredRole: undefined
    },
    {
        id: 'sales',
        name: 'VENDER',
        route: '/sales',
        icon: CircleDollarSign,
        group: 'operacion',
        description: 'Handle sales and transactions',
        requiredRole: undefined
    },
    {
        id: 'catalogue',
        name: 'CATALOGO',
        route: '/catalogue',
        icon: BookOpen,
        group: 'operacion',
        description: 'Manage your product catalog',
        requiredRole: undefined
    },
    {
        id: 'stock',
        name: 'INVENTARIO',
        route: '/stock',
        icon: Package,
        group: 'operacion',
        description: 'Monitor inventory levels',
        requiredRole: undefined
    },
    {
        id: 'analisis',
        name: 'ANALISIS',
        route: '/analisis',
        icon: BarChart3,
        group: 'gestion',
        description: 'Real business metrics and sales trend',
        requiredRole: undefined
    },
    {
        id: 'product-matching',
        name: 'PROVEEDORES',
        route: '/matching',
        icon: Link2,
        group: 'gestion',
        description: 'Match products with supplier price lists',
        requiredRole: undefined
    },
    {
        id: 'settings',
        name: 'CONFIGURACION',
        route: '/settings',
        icon: Settings,
        group: 'gestion',
        description: 'Configure system settings',
        requiredRole: 'administrador'
    }
];
