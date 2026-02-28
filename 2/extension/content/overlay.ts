/**
 * SafeNav Highlight Overlay
 * Renders a highlight box around the element the agent is pointing at.
 */

let overlayEl: HTMLDivElement | null = null;
let labelEl: HTMLDivElement | null = null;
let actionEl: HTMLDivElement | null = null;

export function highlightElement(selector: string, label?: string): void {
  clearHighlight();

  const target = document.querySelector(selector);
  if (!target) {
    console.warn('[SafeNav Overlay] Element not found:', selector);
    return;
  }

  const rect = target.getBoundingClientRect();

  // Highlight box
  overlayEl = document.createElement('div');
  overlayEl.className = 'safenav-overlay';
  overlayEl.style.top = `${rect.top - 4}px`;
  overlayEl.style.left = `${rect.left - 4}px`;
  overlayEl.style.width = `${rect.width + 8}px`;
  overlayEl.style.height = `${rect.height + 8}px`;

  // Label
  if (label) {
    labelEl = document.createElement('div');
    labelEl.className = 'safenav-overlay-label';
    labelEl.textContent = label;
    overlayEl.appendChild(labelEl);
  }

  document.body.appendChild(overlayEl);
}

export function showActionIndicator(
  x: number,
  y: number,
  description: string,
): void {
  clearActionIndicator();

  actionEl = document.createElement('div');
  actionEl.className = 'safenav-action-indicator';
  actionEl.style.top = `${y - 40}px`;
  actionEl.style.left = `${x}px`;

  const dot = document.createElement('div');
  dot.className = 'safenav-action-dot';

  const text = document.createElement('span');
  text.textContent = description;

  actionEl.appendChild(dot);
  actionEl.appendChild(text);
  document.body.appendChild(actionEl);
}

export function clearHighlight(): void {
  overlayEl?.remove();
  overlayEl = null;
  labelEl = null;
}

export function clearActionIndicator(): void {
  actionEl?.remove();
  actionEl = null;
}

export function clearAll(): void {
  clearHighlight();
  clearActionIndicator();
}
