import React from 'react';
import ReactDOM from 'react-dom/client';
// Bundled fonts (no CDN — works offline at the counter)
import '@fontsource-variable/archivo/standard.css';
import '@fontsource/spline-sans-mono/400.css';
import '@fontsource/spline-sans-mono/500.css';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
