/// <reference types="chrome" />
/**
 * SafeNav Content Script
 * Injected into every page. Responsibilities:
 * 1. Inject bottom bar UI via Shadow DOM
 * 2. Execute browser actions (click, type, scroll)
 * 3. Show highlight overlays
 * 4. Relay messages between bar UI and background service worker
 */

import type { Message, BrowserAction } from '../types';
import { SafeNavBar } from '../bar/bar';
import {
  highlightElement,
  showActionIndicator,
  clearAll,
} from './overlay';
import { AudioCapture, AudioPlayer } from '../lib/audio';

// ── Prevent double injection ──
if (document.getElementById('safenav-root')) {
  throw new Error('[SafeNav] Already injected');
}

// ── Shadow DOM Host ──
const host = document.createElement('div');
host.id = 'safenav-root';
const shadow = host.attachShadow({ mode: 'closed' });
document.body.appendChild(host);

// ── Initialize Components ──
const bar = new SafeNavBar(shadow);
const audioCapture = new AudioCapture();
const audioPlayer = new AudioPlayer();

let sessionActive = false;

// ── Bar Toggle Handler ──
bar.onToggle(() => {
  if (sessionActive) {
    stopSession();
  } else {
    startSession();
  }
});

function startSession(): void {
  bar.setState('connecting');
  chrome.runtime.sendMessage({ type: 'START_SESSION' } as Message);
}

function stopSession(): void {
  sessionActive = false;
  audioCapture.stop();
  clearAll();
  chrome.runtime.sendMessage({ type: 'STOP_SESSION' } as Message);
  bar.setState('idle');
}

// ── Message Listener (from background) ──
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    handleMessage(message);
    sendResponse({ ok: true });
  },
);

function handleMessage(message: Message): void {
  switch (message.type) {
    case 'SESSION_STARTED':
      sessionActive = true;
      bar.setState('active');
      // Start mic capture
      audioCapture.start((base64Pcm) => {
        chrome.runtime.sendMessage({
          type: 'AUDIO_DATA',
          data: base64Pcm,
        } as Message);
      });
      break;

    case 'SESSION_STOPPED':
      sessionActive = false;
      audioCapture.stop();
      clearAll();
      bar.setState('idle');
      break;

    case 'SESSION_ERROR':
      sessionActive = false;
      audioCapture.stop();
      bar.setState('error', message.error);
      break;

    case 'STATUS_UPDATE':
      bar.setState(message.status, message.detail);
      break;

    case 'TRANSCRIPTION':
      bar.addTranscript(message.speaker, message.text);
      break;

    case 'PLAY_AUDIO':
      audioPlayer.play(message.data);
      break;

    case 'EXECUTE_ACTION':
      executeAction(message.action);
      break;

    case 'SCREENSHOT_REQUEST':
      captureScreenshot();
      break;

    case 'HIGHLIGHT_ELEMENT':
      highlightElement(message.selector, message.label);
      break;

    case 'CLEAR_HIGHLIGHT':
      clearAll();
      break;

    case 'TASK_PROGRESS':
      bar.setState('acting');
      bar.setTaskProgress(message.current, message.total, message.description);
      break;
  }
}

// ── Browser Action Execution ──
async function executeAction(action: BrowserAction): Promise<void> {
  try {
    switch (action.type) {
      case 'click': {
        const el = document.elementFromPoint(action.x, action.y);
        if (el instanceof HTMLElement) {
          showActionIndicator(action.x, action.y, '클릭 중...');
          el.click();
        }
        break;
      }

      case 'type': {
        let target: Element | null = null;
        if (action.selector) {
          target = document.querySelector(action.selector);
        } else {
          target = document.activeElement;
        }
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.value = action.text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'scroll': {
        const amount = action.direction === 'down' ? action.amount : -action.amount;
        window.scrollBy({ top: amount, behavior: 'smooth' });
        break;
      }
    }

    chrome.runtime.sendMessage({
      type: 'ACTION_RESULT',
      success: true,
    } as Message);
  } catch (err) {
    chrome.runtime.sendMessage({
      type: 'ACTION_RESULT',
      success: false,
      error: String(err),
    } as Message);
  }

  // Clear action indicator after a short delay
  setTimeout(() => clearAll(), 1500);
}

// ── Screenshot Capture ──
function captureScreenshot(): void {
  // Use html2canvas-like approach or just send a placeholder
  // Real implementation would use chrome.tabs.captureVisibleTab in background
  // For now, notify background that screenshot is not available from content script
  console.log('[SafeNav] Screenshot requested — delegating to background');
}
