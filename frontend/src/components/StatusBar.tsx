import { useState, useEffect } from 'react';

export default function StatusBar() {
    const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

    useEffect(() => {
        const checkConnection = () => {
            setConnectionStatus(navigator.onLine ? 'online' : 'offline');
        };

        checkConnection();
        window.addEventListener('online', checkConnection);
        window.addEventListener('offline', checkConnection);

        return () => {
            window.removeEventListener('online', checkConnection);
            window.removeEventListener('offline', checkConnection);
        };
    }, []);

    const online = connectionStatus === 'online';

    return (
        <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-1.5">
                    <span
                        className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}
                        aria-hidden="true"
                    />
                    <span className={online ? 'text-green-600' : 'text-red-500'}>
                        {online ? 'En línea' : 'Sin conexión'}
                    </span>
                </div>

                <div className="flex items-center space-x-4 text-gray-500">
                    <span>v1.0.0</span>
                </div>
            </div>
        </div>
    );
}
