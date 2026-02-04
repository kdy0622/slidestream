import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("SlideCaster: 앱 초기화 시작...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("SlideCaster: React 렌더링 성공");
  } catch (error) {
    console.error("SlideCaster: 초기 로딩 실패:", error);
    container.innerHTML = `
      <div style="background: #0b1120; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #ef4444; margin-bottom: 10px;">앱 실행 오류</h1>
        <p style="color: #94a3b8; margin-bottom: 20px;">브라우저 환경에서 앱을 실행할 수 없습니다.</p>
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #f87171; max-width: 600px; overflow: auto;">
          ${error instanceof Error ? error.message : String(error)}
        </div>
        <button onclick="location.reload()" style="margin-top: 20px; background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">다시 시도</button>
      </div>
    `;
  }
} else {
  console.error("SlideCaster: 'root' 요소를 찾을 수 없습니다.");
}