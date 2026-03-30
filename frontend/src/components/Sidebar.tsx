import { Link, useLocation } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import { MODULES } from '../modules_config';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const { isSidebarCollapsed, toggleSidebar, isMobile, sidebarWidth, setSidebarWidth } = useLayout();
  const location = useLocation();

  // All modules are visible since there's no authentication
  const visibleModules = MODULES;

  const handleLinkClick = () => {
    if (isMobile && !isSidebarCollapsed) {
      toggleSidebar();
    }
  };

  // Base width classes
  const mobileWidth = 'w-64';
  const desktopWidth = 'lg:w-72 xl:w-80';

  // Handle drag events for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = startWidth + deltaX;
      setSidebarWidth(newWidth);
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* OUTER CONTAINER 
        Handles the space the sidebar takes up in the document flow (Desktop).
        On mobile, it creates no space (width 0 effectively) because the inner is fixed.
      */}
      <aside 
        className={`
          relative transition-all duration-300 ease-in-out h-full z-50
          ${isSidebarCollapsed ? 'lg:w-0' : ''}
          ${className}
        `}
        style={{
          width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px`,
          minWidth: isSidebarCollapsed ? '0px' : '200px',
          maxWidth: isSidebarCollapsed ? '0px' : '400px',
        }}
      >
        {/* INNER CONTAINER 
          Holds the actual visual sidebar. 
          It has a fixed width so content doesn't squash when the outer container shrinks.
        */}
        <div 
          className={`
            fixed inset-y-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg flex flex-col
            transition-transform duration-300 ease-in-out
            ${mobileWidth} ${desktopWidth} 
            ${/* Mobile Logic: slide in/out */ ''}
            ${isMobile 
                ? (isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0') 
                : '' 
            }
            ${/* Desktop Logic: If outer is collapsed, we still want this fixed/absolute relative to parent, 
               but we translate it off screen or clip it. 
               Here we use -translate-x-full to slide it away visually on desktop too */ ''}
            ${!isMobile && isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
          `}
          style={{
            width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px`,
            minWidth: isSidebarCollapsed ? '0px' : '200px',
            maxWidth: isSidebarCollapsed ? '0px' : '400px',
          }}
        >
          
          {/* --- SIDEBAR CONTENT --- */}
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex-shrink-0 flex items-center justify-center">
                <span className="text-xl font-bold">E</span>
              </div>
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-semibold">ERP System</h1>
                <p className="text-xs opacity-90">Enterprise Resource Planning</p>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            {visibleModules.map((module) => {
              const isActive = location.pathname === module.route;
              return (
                <Link
                  key={module.id}
                  to={module.route}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className={`text-lg flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {module.icon}
                  </span>
                  <span className="ml-3 flex-1 text-left truncate">
                    {module.name}
                  </span>
                </Link>
              );
            })}
          </nav>


          {/* DRAG HANDLE */}
          {!isSidebarCollapsed && (
            <div
              onMouseDown={handleMouseDown}
              className={`
                absolute right-0 top-0 bottom-0 w-2 hover:w-3 cursor-ew-resize 
                bg-gray-200 hover:bg-blue-400 transition-all duration-200
                group-hover:bg-blue-400
              `}
              title="Arrastra para cambiar el tamaño"
            >
              {/* Visual indicator dots */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col space-y-1">
                  <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                  <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                  <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* TOGGLE BUTTON (Desktop)
             Placed ABSOLUTE relative to the Inner Container, but positioned on the RIGHT edge.
             When Inner Container translates left (-100%), we want this button to stick out?
             
             Actually, standard UI pattern:
             If we slide the sidebar away using translate-x-full, the button attached to it will also slide away.
             
             To fix this, we attach the button to the OUTER RIGHT edge of the sidebar.
          */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className={`
                absolute top-20 -right-4 
                w-8 h-12 bg-white border border-gray-300 border-l-0 rounded-r-lg shadow-md 
                hover:bg-gray-50 transition-colors flex items-center justify-center z-50
                /* If sidebar is hidden (translated left), we need the button to effectively sit on the left edge of the screen. */
                /* However, since the parent is moving, the button moves with it. */
                /* To solve this, we usually don't put the open button ON the sidebar if the sidebar leaves the screen. */
                /* But assuming you want it to look like a tab: */
              `}
              style={{
                /* When collapsed, the sidebar is -100% (off screen). 
                   We need to push the button back onto the screen. */
                 transform: isSidebarCollapsed ? `translateX(100%) translateX(1rem)` : 'none'
              }}
            >
              <svg 
                className={`w-4 h-4 text-gray-600 transition-transform ${isSidebarCollapsed ? 'rotate-180' : 'rotate-0'}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}