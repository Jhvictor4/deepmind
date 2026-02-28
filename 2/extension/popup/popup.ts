const dot = document.getElementById('dot');
const statusEl = document.getElementById('status');

if (!(dot instanceof HTMLElement) || !(statusEl instanceof HTMLElement)) {
  throw new Error('Popup elements not found');
}

// Check if websocket bridge server is reachable.
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
  dot.classList.add('connected');
  statusEl.textContent = 'Bridge connected (ws://localhost:8765)';
  ws.close();
};

ws.onerror = () => {
  statusEl.textContent = 'Bridge offline — run python live-agent-gemini/agent.py --mode extension';
};
