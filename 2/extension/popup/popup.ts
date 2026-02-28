const dot = document.getElementById('dot');
const statusEl = document.getElementById('status');

if (!(dot instanceof HTMLElement) || !(statusEl instanceof HTMLElement)) {
  throw new Error('Popup elements not found');
}

// Check if token server is reachable.
fetch('http://localhost:8081/health')
  .then((r) => r.json())
  .then(() => {
    dot.classList.add('connected');
    statusEl.textContent = 'Server connected';
  })
  .catch(() => {
    statusEl.textContent = 'Server offline — run pnpm dev:all';
  });
