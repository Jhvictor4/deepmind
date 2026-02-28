/// <reference types="chrome" />
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';
import type { Message, SessionState, ToolRequest, ToolResponse, DataChannelMessage } from '../types';

// ── Session State ──

const session: SessionState = {
  active: false,
  tabId: null,
  taskContext: '',
  currentStep: 0,
  totalSteps: 0,
};

let livekitRoom: Room | null = null;

// LiveKit config — fetched from token endpoint or hardcoded for testing
const LIVEKIT_URL = 'wss://joey-oyxfplv7.livekit.cloud';
const TOKEN_ENDPOINT = 'http://localhost:8081/token';

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

    case 'TOOL_RESPONSE_FROM_CONTENT':
      // Content script finished executing a tool — send response back to agent via data channel
      return sendDataChannelMessage(message.response);

    default:
      console.warn('[SafeNav BG] Unknown message:', message);
      return { ok: false };
  }
}

// ── Session Lifecycle ──

async function startSession(tabId: number | null): Promise<{ ok: boolean; error?: string }> {
  if (session.active) {
    return { ok: false, error: 'Session already active' };
  }

  session.active = true;
  session.tabId = tabId;
  session.currentStep = 0;
  session.totalSteps = 0;

  // Notify content script
  if (tabId) {
    sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'connecting' });
  }

  try {
    // 1. Fetch LiveKit token from agent server
    const token = await fetchLivekitToken();

    // 2. Connect to LiveKit room
    livekitRoom = new Room();

    // Listen for data messages from agent
    livekitRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg: DataChannelMessage = JSON.parse(text);
        handleDataChannelMessage(msg);
      } catch (err) {
        console.error('[SafeNav BG] Failed to parse data channel message:', err);
      }
    });

    livekitRoom.on(RoomEvent.Disconnected, () => {
      console.log('[SafeNav BG] LiveKit room disconnected');
      if (session.active) {
        stopSession();
      }
    });

    await livekitRoom.connect(LIVEKIT_URL, token);
    console.log('[SafeNav BG] Connected to LiveKit room:', livekitRoom.name);

    // 3. Publish screen share
    await livekitRoom.localParticipant.setScreenShareEnabled(true);
    console.log('[SafeNav BG] Screen share published');

    // Notify content script — session is live
    if (tabId) {
      sendToTab(tabId, { type: 'SESSION_STARTED' });
      sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'active' });
    }

    return { ok: true };
  } catch (err) {
    console.error('[SafeNav BG] Failed to start LiveKit session:', err);
    session.active = false;

    if (tabId) {
      sendToTab(tabId, { type: 'SESSION_ERROR', error: String(err) });
      sendToTab(tabId, { type: 'STATUS_UPDATE', status: 'error', detail: String(err) });
    }

    return { ok: false, error: String(err) };
  }
}

async function stopSession(): Promise<{ ok: boolean }> {
  const { tabId } = session;

  // Disconnect LiveKit room
  if (livekitRoom) {
    livekitRoom.disconnect();
    livekitRoom = null;
  }

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

// ── LiveKit Token ──

async function fetchLivekitToken(): Promise<string> {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'safenav-extension', name: 'SafeNav Browser' }),
  });

  if (!resp.ok) {
    throw new Error(`Token endpoint returned ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.token;
}

// ── Data Channel Communication ──

function handleDataChannelMessage(msg: DataChannelMessage): void {
  if (msg.type === 'tool_request') {
    console.log(`[SafeNav BG] Tool request from agent: ${msg.tool}`, msg.params);

    // Relay tool request to content script for execution
    if (session.tabId) {
      sendToTab(session.tabId, { type: 'TOOL_REQUEST', request: msg });
    } else {
      // No active tab — send failure back to agent
      sendDataChannelMessage({
        type: 'tool_response',
        id: msg.id,
        success: false,
        result: 'No active tab',
      });
    }
  }
}

function sendDataChannelMessage(msg: DataChannelMessage): { ok: boolean } {
  if (!livekitRoom) {
    console.warn('[SafeNav BG] No LiveKit room — cannot send data channel message');
    return { ok: false };
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(msg));
  livekitRoom.localParticipant.publishData(data, { reliable: true });
  console.log(`[SafeNav BG] Sent data channel message: ${msg.type}`);
  return { ok: true };
}

// ── Gemini API Stubs (kept for future direct Gemini connection) ──

async function handleScreenshot(_base64: string): Promise<{ ok: boolean }> {
  console.log('[SafeNav BG] Screenshot received, length:', _base64.length);
  return { ok: true };
}

async function handleActionResult(
  success: boolean,
  error?: string,
): Promise<{ ok: boolean }> {
  console.log('[SafeNav BG] Action result:', success, error);
  return { ok: true };
}

async function handleAudioData(_base64Pcm: string): Promise<{ ok: boolean }> {
  // Audio is handled via LiveKit audio tracks, not data channel
  return { ok: true };
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
