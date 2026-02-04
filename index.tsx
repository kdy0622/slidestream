import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    // JSX 문법(<App />) 대신 createElement를 사용하여 브라우저 직접 해석 시의 오류 방지
    root.render(
      React.createElement(React.StrictMode, null, 
        React.createElement(App)
      )
    );
  } catch (err) {
    console.error("Rendering Error:", err);
  }
} else {
  console.error("Fatal Error: Root element '#root' not found.");
}