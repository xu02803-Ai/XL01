import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        // If a SW is already running, force it to update to the new "Network Only" version
        registration.update();
        console.log('PWA Service Worker registered');
      })
      .catch(err => {
        console.log('SW registration failed: ', err);
      });
      
    // If the controller changes (new SW takes over), reload to ensure fresh code
    navigator.serviceWorker.addEventListener('controllerchange', () => {
       console.log("New Service Worker activated. Reloading...");
       window.location.reload();
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Wrap in try-catch to log render errors to screen
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Render failed:", e);
  document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px;">应用启动失败，请清除浏览器缓存后重试。<br/>App failed to start. Please clear browser cache.</div>';
}