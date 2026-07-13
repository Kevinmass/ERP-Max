import type { Categoria } from './types';

// Sort categories hierarchically (parents immediately followed by their children,
// recursively) so a flat <select> still reads top-to-bottom as a tree.
export function sortCategoriesHierarchically(categorias: Categoria[]): Categoria[] {
    const rootCategorias = categorias
        .filter(cat => !cat.categoria_padre_id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    const result: Categoria[] = [];

    const addCategoryAndChildren = (category: Categoria) => {
        result.push(category);

        const children = categorias
            .filter(cat => cat.categoria_padre_id === category.id)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        children.forEach(child => addCategoryAndChildren(child));
    };

    rootCategorias.forEach(rootCategory => addCategoryAndChildren(rootCategory));

    return result;
}

// Full "Padre › Hijo › Nieto" path for a category — self-explanatory in a plain
// <select> without requiring the user to read indentation as hierarchy. Every
// level (including parents) still appears as its own selectable option.
export function getCategoryBreadcrumb(categoria: Categoria, categorias: Categoria[]): string {
    const path = [categoria.nombre];
    let parentId = categoria.categoria_padre_id;

    while (parentId) {
        const parent = categorias.find(cat => cat.id === parentId);
        if (!parent) break;
        path.unshift(parent.nombre);
        parentId = parent.categoria_padre_id;
    }

    return path.join(' › ');
}

// A category plus every one of its descendants — used by client-side filters
// (e.g. Inventario) that don't have backend-side hierarchical filtering like
// Catálogo's get_productos does.
export function getDescendantCategoryIds(categoriaId: number, categorias: Categoria[]): Set<number> {
    const ids = new Set<number>([categoriaId]);
    let added = true;
    while (added) {
        added = false;
        for (const cat of categorias) {
            if (cat.categoria_padre_id != null && ids.has(cat.categoria_padre_id) && !ids.has(cat.id)) {
                ids.add(cat.id);
                added = true;
            }
        }
    }
    return ids;
}
