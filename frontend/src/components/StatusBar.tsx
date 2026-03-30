import { useState, useEffect } from 'react';

export default function StatusBar() {
    const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
    const [systemInfo, setSystemInfo] = useState({
        memoryUsage: '0 MB',
        cpuUsage: '0%',
    });

    // Simulate connection status and system monitoring
    useEffect(() => {
        // Check connection status
        const checkConnection = () => {
            setConnectionStatus(navigator.onLine ? 'online' : 'offline');
        };

        checkConnection();
        window.addEventListener('online', checkConnection);
        window.addEventListener('offline', checkConnection);

        // Simulate system monitoring
        const updateSystemInfo = () => {
            // In a real app, this would get actual system metrics
            const memoryUsage = Math.floor(Math.random() * 100) + 200; // 200-300 MB
            const cpuUsage = Math.floor(Math.random() * 30) + 10; // 10-40%

            setSystemInfo({
                memoryUsage: `${memoryUsage} MB`,
                cpuUsage: `${cpuUsage}%`,
            });
        };

        updateSystemInfo();
        const interval = setInterval(updateSystemInfo, 5000); // Update every 5 seconds

        return () => {
            window.removeEventListener('online', checkConnection);
            window.removeEventListener('offline', checkConnection);
            clearInterval(interval);
        };
    }, []);

    const getConnectionColor = () => {
        return connectionStatus === 'online' ? 'text-green-500' : 'text-red-500';
    };

    const getConnectionIcon = () => {
        return connectionStatus === 'online' ? '🟢' : '🔴';
    };

    return (
        <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left Section: System Status */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                        <span>{getConnectionIcon()}</span>
                        <span className={getConnectionColor()}>
                            {connectionStatus.toUpperCase()}
                        </span>
                    </div>

                    <div className="hidden sm:flex items-center space-x-4 text-gray-600">
                        <span>Memory: {systemInfo.memoryUsage}</span>
                        <span>CPU: {systemInfo.cpuUsage}</span>
                    </div>
                </div>

                {/* Right Section: Additional Info */}
                <div className="flex items-center space-x-4 text-gray-500">
                    <span>v1.0.0</span>
                    <span>ERP System</span>
                </div>
            </div>
        </div>
    );
}
