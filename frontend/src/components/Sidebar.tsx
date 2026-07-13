import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { MODULES, GROUP_LABELS, ModuleGroup } from '../modules_config';

interface SidebarProps {
  className?: string;
}

// Collapsed desktop sidebar is an icon RAIL (64px), never fully hidden —
// the old slide-off-screen design took the reopen button with it, leaving
// no way to bring the sidebar back. Mobile keeps the overlay drawer.
const RAIL_WIDTH = 64;
const MOBILE_WIDTH = 256;

export default function Sidebar({ className = '' }: SidebarProps) {
  const { isSidebarCollapsed, toggleSidebar, isMobile, sidebarWidth, setSidebarWidth } = useLayout();
  const location = useLocation();

  const groups: ModuleGroup[] = ['operacion', 'gestion'];
  const isRail = !isMobile && isSidebarCollapsed;
  const width = isMobile ? MOBILE_WIDTH : (isRail ? RAIL_WIDTH : sidebarWidth);

  const handleLinkClick = () => {
    if (isMobile && !isSidebarCollapsed) {
      toggleSidebar();
    }
  };

  // Drag-to-resize (expanded desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setSidebarWidth(startWidth + deltaX);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Outer container reserves flow space on desktop; none on mobile (drawer). */}
      <aside
        className={`relative h-full z-50 transition-all duration-300 ease-in-out ${className}`}
        style={{ width: isMobile ? 0 : width }}
      >
        <div
          className={`
            fixed inset-y-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col
            transition-all duration-300 ease-in-out
            ${isMobile ? (isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0') : ''}
          `}
          style={{ width }}
        >
          {/* Top: collapse/expand control — always reachable */}
          <div className={`flex items-center h-14 border-b border-gray-200 shrink-0 ${isRail ? 'justify-center' : 'justify-between px-3'}`}>
            {!isRail && (
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
                Menú
              </span>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title={isMobile ? 'Cerrar menú' : isRail ? 'Expandir menú' : 'Contraer menú'}
            >
              {isMobile
                ? <X className="w-5 h-5" strokeWidth={1.5} />
                : isRail
                  ? <PanelLeftOpen className="w-5 h-5" strokeWidth={1.5} />
                  : <PanelLeftClose className="w-5 h-5" strokeWidth={1.5} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
            {groups.map((group) => {
              const groupModules = MODULES.filter(m => m.group === group);
              if (groupModules.length === 0) return null;
              return (
                <div key={group}>
                  {isRail ? (
                    group !== groups[0] && <div className="mx-2 mb-3 border-t border-gray-200" />
                  ) : (
                    <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {GROUP_LABELS[group]}
                    </div>
                  )}
                  <div className="space-y-1">
                    {groupModules.map((module) => {
                      const isActive = location.pathname === module.route;
                      return (
                        <Link
                          key={module.id}
                          to={module.route}
                          onClick={handleLinkClick}
                          title={isRail ? module.name : undefined}
                          className={`
                            flex items-center rounded-md text-sm font-medium transition-colors whitespace-nowrap
                            ${isRail ? 'justify-center p-2.5' : 'px-3 py-2.5'}
                            ${isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <module.icon
                            className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                            strokeWidth={1.5}
                          />
                          {!isRail && (
                            <span className="ml-3 flex-1 text-left truncate">
                              {module.name}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Drag handle (expanded desktop only) */}
          {!isMobile && !isSidebarCollapsed && (
            <div
              onMouseDown={handleMouseDown}
              className="absolute right-0 top-0 bottom-0 w-1.5 hover:w-2 cursor-ew-resize bg-transparent hover:bg-blue-300 transition-all duration-200"
              title="Arrastra para cambiar el tamaño"
            />
          )}
        </div>
      </aside>
    </>
  );
}
