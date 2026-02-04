
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error("Could not find root element with id 'root'");
}

const root = createRoot(container);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Application Render Error:", error);
  container.innerHTML = `
    <div style="background: #0b1120; color: #fff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
      <h1 style="font-size: 24px; margin-bottom: 10px;">애플리케이션 로드 중 오류가 발생했습니다.</h1>
      <p style="color: #94a3b8; max-width: 500px; line-height: 1.6;">브라우저 호환성 문제이거나 필요한 리소스를 불러오지 못했습니다. 페이지를 새로고침하거나 최신 브라우저를 사용해 주세요.</p>
      <pre style="margin-top: 20px; background: #1e293b; padding: 15px; border-radius: 8px; font-size: 12px; color: #f87171; text-align: left; overflow: auto; max-width: 100%;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `;
}
