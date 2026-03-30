export interface ModuleConfig {
    id: string;
    name: string;
    route: string;
    icon: string;
    description?: string;
    requiredRole?: string; // 'administrador' or undefined for all users
}

export const MODULES: ModuleConfig[] = [
    {
        id: 'catalogue',
        name: 'CATALOGO',
        route: '/catalogue',
        icon: '📚',
        description: 'Manage your product catalog',
        requiredRole: undefined // Available to all users
    },
    {
        id: 'categorias',
        name: 'CATEGORIAS',
        route: '/categorias',
        icon: '📁',
        description: 'Manage product categories',
        requiredRole: undefined // Available to all users
    },
    {
        id: 'sales',
        name: 'VENTAS',
        route: '/sales',
        icon: '💰',
        description: 'Handle sales and transactions',
        requiredRole: undefined // Available to all users
    },
    {
        id: 'stock',
        name: 'INVENTARIO',
        route: '/stock',
        icon: '📦',
        description: 'Monitor inventory levels',
        requiredRole: undefined // Available to all users
    },
    {
        id: 'settings',
        name: 'CONFIGURACION',
        route: '/settings',
        icon: '⚙️',
        description: 'Configure system settings',
        requiredRole: 'administrador' // Only for administrators
    },
    {
        id: 'product-matching',
        name: 'MATCHING',
        route: '/matching',
        icon: '🔗',
        description: 'Match products with supplier price lists',
        requiredRole: undefined // Available to all users
    }
];
