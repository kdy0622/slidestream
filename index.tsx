
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("Critical Error: Root element '#root' not found in HTML.");
      return;
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("React Mounting Error:", err);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="color: white; padding: 40px; text-align: center; font-family: sans-serif; background: #0b1120; height: 100vh;">
        <h2 style="font-weight: 800;">앱 초기화 중 오류가 발생했습니다.</h2>
        <p style="color: #64748b; margin-top: 10px;">브라우저 콘솔을 확인하거나 페이지를 새로고침해 주세요.</p>
        <div style="margin-top: 20px; text-align: left; background: #1e293b; padding: 15px; border-radius: 12px; font-family: monospace; font-size: 12px; overflow: auto; max-width: 600px; display: inline-block;">
          ${err instanceof Error ? err.message : String(err)}
        </div>
      </div>`;
    }
  }
};

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
