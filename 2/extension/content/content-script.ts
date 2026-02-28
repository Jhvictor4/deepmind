/// <reference types="chrome" />
/**
 * SafeNav Content Script
 * Injected into every page. Responsibilities:
 * 1. Inject bottom bar UI via Shadow DOM
 * 2. Execute browser actions (click, type, scroll)
 * 3. Show highlight overlays
 * 4. Relay messages between bar UI and background service worker
 * 5. Handle tool requests from agent via data channel (relayed through background)
 */

import type { Message, BrowserAction, ToolRequest, ToolResponse } from '../types';
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

// ── Text Input Handler ──
bar.onText((text) => {
  bar.addTranscript('user', text);
  chrome.runtime.sendMessage({ type: 'TEXT_INPUT', text } as Message);
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
      console.log('[SafeNav Content] SESSION_STARTED — starting mic capture');
      audioCapture.start((base64Pcm) => {
        console.log('[SafeNav Content] Sending AUDIO_DATA, size:', base64Pcm.length);
        chrome.runtime.sendMessage({
          type: 'AUDIO_DATA',
          data: base64Pcm,
        } as Message);
      }).catch((err) => {
        console.error('[SafeNav Content] Mic capture failed:', err);
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
      bar.addTranscript(message.speaker, message.text, message.delta);
      break;

    case 'PLAY_AUDIO':
      console.log('[SafeNav Content] Playing audio, size:', message.data?.length ?? 0);
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

    // ── Data Channel Tool Request (from agent via background) ──
    case 'TOOL_REQUEST':
      handleToolRequest(message.request);
      break;
  }
}

// ── Tool Request Handler (from agent via LiveKit data channel) ──

async function handleToolRequest(request: ToolRequest): Promise<void> {
  const { id, tool, params } = request;
  let success = true;
  let result = '';

  try {
    bar.setState('acting');

    switch (tool) {
      case 'clickElement': {
        const x = params.x as number;
        const y = params.y as number;
        const el = document.elementFromPoint(x, y);
        if (el instanceof HTMLElement) {
          showActionIndicator(x, y, '클릭 중...');
          el.click();
          result = `Clicked element <${el.tagName.toLowerCase()}> at (${x}, ${y})`;
        } else {
          result = `No clickable element found at (${x}, ${y})`;
          success = false;
        }
        break;
      }

      case 'typeText': {
        const text = params.text as string;
        const selector = params.selector as string | undefined;
        let target: Element | null = null;
        if (selector) {
          target = document.querySelector(selector);
        } else {
          target = document.activeElement;
        }
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.focus();
          target.value = text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          result = `Typed "${text}" into <${target.tagName.toLowerCase()}>`;
        } else {
          result = 'No focusable input element found';
          success = false;
        }
        break;
      }

      case 'scrollPage': {
        const direction = params.direction as 'up' | 'down';
        const amount = (params.amount as number) ?? 300;
        const scrollAmount = direction === 'down' ? amount : -amount;
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        result = `Scrolled ${direction} ${amount}px`;
        break;
      }

      case 'navigateTo': {
        const url = params.url as string;
        window.location.href = url;
        result = `Navigating to ${url}`;
        break;
      }

      case 'takeScreenshot': {
        // Delegate to background for chrome.tabs.captureVisibleTab
        result = 'Screenshot request delegated to background';
        break;
      }

      default:
        result = `Unknown tool: ${tool}`;
        success = false;
    }
  } catch (err) {
    success = false;
    result = `Error executing ${tool}: ${String(err)}`;
  }

  // Send tool response back to background → agent via data channel
  const response: ToolResponse = {
    type: 'tool_response',
    id,
    success,
    result,
  };

  chrome.runtime.sendMessage({
    type: 'TOOL_RESPONSE_FROM_CONTENT',
    response,
  } as Message);

  // Restore bar state after action
  setTimeout(() => {
    if (sessionActive) {
      bar.setState('active');
    }
    clearAll();
  }, 1500);
}

// ── Browser Action Execution (legacy — kept for direct background commands) ──
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
  console.log('[SafeNav] Screenshot requested — delegating to background');
}
