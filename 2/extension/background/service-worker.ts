/// <reference types="chrome" />
import type { Message, DataChannelMessage } from '../types';

// ── Session State ──

interface SessionState {
  active: boolean;
  tabId: number | null;
}

const session: SessionState = {
  active: false,
  tabId: null,
};

let offscreenReady = false;

// ── Message Handler ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Messages from offscreen document
  if (message.type === 'DATA_FROM_AGENT') {
    handleDataFromAgent(message.data as DataChannelMessage);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'PLAY_AUDIO_TO_TAB') {
    if (session.tabId) {
      sendToTab(session.tabId, { type: 'PLAY_AUDIO', data: String(message.data ?? '') });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'OFFSCREEN_DISCONNECTED') {
    console.log('[SafeNav BG] Offscreen reports WebSocket disconnected');
    if (session.active) {
      stopSession();
    }
    sendResponse({ ok: true });
    return false;
  }

  // Messages from content script
  const msg = message as Message;
  switch (msg.type) {
    case 'START_SESSION':
      startSession(sender.tab?.id ?? null).then(sendResponse);
      return true;

    case 'STOP_SESSION':
      stopSession().then(sendResponse);
      return true;

    case 'TOOL_RESPONSE_FROM_CONTENT':
      // Content script finished a tool — relay to offscreen → agent
      sendToOffscreen('OFFSCREEN_SEND_DATA', { data: msg.response });
      sendResponse({ ok: true });
      return false;

    case 'AUDIO_DATA':
      // Stream user microphone PCM to agent via offscreen WebSocket
      sendToOffscreen('OFFSCREEN_SEND_DATA', {
        data: {
          type: 'audio_in',
          data: msg.data,
        },
      });
      sendResponse({ ok: true });
      return false;

    default:
      sendResponse({ ok: true });
      return false;
  }
});

// ── Session Lifecycle ──

async function startSession(tabId: number | null): Promise<{ ok: boolean; error?: string }> {
  if (session.active) {
    return { ok: false, error: 'Session already active' };
  }

  if (!tabId) {
    return { ok: false, error: 'No active tab' };
  }

  session.active = true;
  session.tabId = tabId;

  sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'connecting' });

  try {
    // 1. Get tab capture stream ID
    const streamId = await getTabCaptureStreamId(tabId);

    // 2. Create offscreen document and start WebSocket + capture there
    await ensureOffscreenDocument();

    const resp = await sendToOffscreen('OFFSCREEN_START', { streamId });

    if (!resp?.ok) {
      throw new Error(resp?.error || 'Offscreen failed to start');
    }

    console.log('[SafeNav BG] Session started — WebSocket + screen capture via offscreen');

    sendToTab(tabId, { type: 'SESSION_STARTED' });
    sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'active' });

    return { ok: true };
  } catch (err) {
    console.error('[SafeNav BG] Failed to start session:', err);
    session.active = false;
    session.tabId = null;

    if (tabId) {
      sendToTab(tabId, { type: 'SESSION_ERROR', error: String(err) });
      sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'error', detail: String(err) });
    }

    return { ok: false, error: String(err) };
  }
}

async function stopSession(): Promise<{ ok: boolean }> {
  const { tabId } = session;

  // Stop offscreen WebSocket + capture
  await sendToOffscreen('OFFSCREEN_STOP', {});

  // Close offscreen document
  try {
    await chrome.offscreen.closeDocument();
    offscreenReady = false;
  } catch {
    // May already be closed
  }

  session.active = false;
  session.tabId = null;

  if (tabId) {
    sendToTab(tabId, { type: 'SESSION_STOPPED' });
    sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'idle' });
  }

  return { ok: true };
}

// ── Tab Capture ──

function getTabCaptureStreamId(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId(
      { targetTabId: tabId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!streamId) {
          reject(new Error('No stream ID returned from tabCapture'));
          return;
        }
        console.log('[SafeNav BG] Got tabCapture streamId');
        resolve(streamId);
      },
    );
  });
}

// ── Offscreen Document Management ──

async function ensureOffscreenDocument(): Promise<void> {
  if (offscreenReady) return;

  // Check if already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (existingContexts.length > 0) {
    offscreenReady = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Tab capture for screen sharing via WebSocket',
  });

  offscreenReady = true;
  console.log('[SafeNav BG] Offscreen document created');
}

function sendToOffscreen(type: string, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  return chrome.runtime.sendMessage({
    target: 'offscreen',
    type,
    ...payload,
  });
}

// ── Data Channel Relay ──

function handleDataFromAgent(msg: DataChannelMessage): void {
  if (msg.type === 'tool_request') {
    console.log(`[SafeNav BG] Tool request from agent: ${msg.tool}`, msg.params);

    if (session.tabId) {
      sendToTab(session.tabId, { type: 'TOOL_REQUEST', request: msg });
    } else {
      // No active tab — send failure back
      sendToOffscreen('OFFSCREEN_SEND_DATA', {
        data: {
          type: 'tool_response',
          id: msg.id,
          success: false,
          result: 'No active tab',
        },
      });
    }
  }
}

// ── Helpers ──

function sendToTab(tabId: number, message: Message): void {
  chrome.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn('[SafeNav BG] Failed to send to tab:', err);
  });
}

// Keep service worker alive while session is active
setInterval(() => {
  if (session.active) {
    console.log('[SafeNav BG] Session keepalive');
  }
}, 25_000);
