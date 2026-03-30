import { Link, useLocation } from 'react-router-dom';
import { MODULES } from '../modules_config';

interface BreadcrumbItem {
    name: string;
    path: string;
    isActive: boolean;
}

export default function Breadcrumb() {
    const location = useLocation();

    // Generate breadcrumb items based on current route
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [];

        // Add current module if we're in one (skip dashboard)
        if (location.pathname !== '/') {
            const currentModule = MODULES.find(module => module.route === location.pathname);
            if (currentModule) {
                breadcrumbs.push({
                    name: currentModule.name,
                    path: currentModule.route,
                    isActive: true,
                });
            }
        }

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    if (breadcrumbs.length === 0) {
        return null; // Don't show breadcrumbs on dashboard
    }

    return (
        <nav className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-2 py-3 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.path} className="flex items-center">
                            {index > 0 && (
                                <svg
                                    className="w-4 h-4 text-gray-400 mx-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                            {crumb.isActive ? (
                                <span className="text-gray-900 font-medium">{crumb.name}</span>
                            ) : (
                                <Link
                                    to={crumb.path}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {crumb.name}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </nav>
    );
}
