/// <reference types="chrome" />
import type { Message, SessionState, BrowserAction } from '../types';

// ── Session State ──

const session: SessionState = {
  active: false,
  tabId: null,
  taskContext: '',
  currentStep: 0,
  totalSteps: 0,
};

// ── Message Handler ──

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // keep channel open for async response
  },
);

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'START_SESSION':
      return startSession(sender.tab?.id ?? null);

    case 'STOP_SESSION':
      return stopSession();

    case 'SCREENSHOT_RESULT':
      return handleScreenshot(message.data);

    case 'ACTION_RESULT':
      return handleActionResult(message.success, message.error);

    case 'AUDIO_DATA':
      return handleAudioData(message.data);

    default:
      console.warn('[SafeNav BG] Unknown message:', message);
      return { ok: false };
  }
}

// ── Session Lifecycle ──

async function startSession(tabId: number | null): Promise<{ ok: boolean }> {
  if (session.active) {
    return { ok: false };
  }

  session.active = true;
  session.tabId = tabId;
  session.currentStep = 0;
  session.totalSteps = 0;

  // Notify content script
  if (tabId) {
    sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'connecting' });
  }

  // TODO: Initialize Gemini Live API WebSocket session here
  // For now, simulate a successful connection after a short delay
  setTimeout(() => {
    if (session.active && tabId) {
      sendToTab(tabId, { type: 'SESSION_STARTED' });
      sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'active' });
    }
  }, 1500);

  return { ok: true };
}

async function stopSession(): Promise<{ ok: boolean }> {
  const { tabId } = session;

  // TODO: Close Gemini Live API session

  session.active = false;
  session.tabId = null;
  session.taskContext = '';
  session.currentStep = 0;
  session.totalSteps = 0;

  if (tabId) {
    sendToTab(tabId, { type: 'SESSION_STOPPED' });
    sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'idle' });
  }

  return { ok: true };
}

// ── Gemini API Stubs ──

async function handleScreenshot(_base64: string): Promise<{ ok: boolean }> {
  // TODO: Send screenshot to Gemini as tool response
  console.log('[SafeNav BG] Screenshot received, length:', _base64.length);
  return { ok: true };
}

async function handleActionResult(
  success: boolean,
  error?: string,
): Promise<{ ok: boolean }> {
  // TODO: Send action result to Gemini as tool response
  console.log('[SafeNav BG] Action result:', success, error);
  return { ok: true };
}

async function handleAudioData(_base64Pcm: string): Promise<{ ok: boolean }> {
  // TODO: Forward audio PCM to Gemini Live API session
  // session.liveSession.sendRealtimeInput({ audio: _base64Pcm });
  return { ok: true };
}

// ── Helpers ──

function sendToTab(tabId: number, message: Message): void {
  chrome.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn('[SafeNav BG] Failed to send to tab:', err);
  });
}

// Request screenshot from content script
function requestScreenshot(): void {
  if (session.tabId) {
    sendToTab(session.tabId, { type: 'SCREENSHOT_REQUEST' });
  }
}

// Send browser action to content script
function executeAction(action: BrowserAction): void {
  if (session.tabId) {
    sendToTab(session.tabId, { type: 'EXECUTE_ACTION', action });
  }
}

// Keep service worker alive while session is active
setInterval(() => {
  if (session.active) {
    console.log('[SafeNav BG] Session keepalive');
  }
}, 25_000);
