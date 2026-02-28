/// <reference types="chrome" />
/**
 * SafeNav Offscreen Document
 *
 * Runs in an offscreen document context (has DOM APIs, unlike service worker).
 * Responsibilities:
 * 1. Connect to Python agent via WebSocket (ws://localhost:8765)
 * 2. Capture tab via chrome.tabCapture streamId → MediaStream
 * 3. Periodically send JPEG frames to agent via WebSocket
 * 4. Relay tool requests/responses between agent and content script via chrome.runtime
 */

import type { AudioInMessage, DataChannelMessage } from '../types';

const WS_URL = 'ws://localhost:8765';
const FRAME_INTERVAL_MS = 2000; // send a screen frame every 2 seconds

let ws: WebSocket | null = null;
let captureStream: MediaStream | null = null;
let frameTimer: ReturnType<typeof setInterval> | null = null;
let videoEl: HTMLVideoElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// ── Message Handler (from service worker) ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'OFFSCREEN_START': {
      const { streamId } = message;
      startConnection(streamId)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true; // async
    }

    case 'OFFSCREEN_STOP': {
      stopConnection();
      sendResponse({ ok: true });
      return false;
    }

    case 'OFFSCREEN_SEND_DATA': {
      // Forward tool responses / audio chunks from extension to agent via WebSocket
      sendToAgent(message.data);
      sendResponse({ ok: true });
      return false;
    }
  }
});

// ── WebSocket + Tab Capture ──

async function startConnection(streamId: string): Promise<void> {
  // 1. Get MediaStream from tabCapture streamId
  captureStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-expect-error — mandatory constraint for tabCapture streamId
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  });

  const videoTrack = captureStream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('No video track from tab capture');
  }

  console.log('[SafeNav Offscreen] Tab capture video track obtained');

  // Set up hidden video + canvas for JPEG frame capture
  videoEl = document.createElement('video');
  videoEl.srcObject = new MediaStream([videoTrack]);
  videoEl.muted = true;
  videoEl.play();

  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');

  // 2. Connect to agent via WebSocket
  await connectWebSocket();

  // 3. Start periodic frame capture
  frameTimer = setInterval(() => captureAndSendFrame(), FRAME_INTERVAL_MS);
}

function connectWebSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[SafeNav Offscreen] WebSocket connected to agent');
      resolve();
    };

    ws.onerror = (e) => {
      console.error('[SafeNav Offscreen] WebSocket error:', e);
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      console.log('[SafeNav Offscreen] WebSocket closed');
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_DISCONNECTED' });
    };

    ws.onmessage = (event) => {
      try {
        const msg: DataChannelMessage = JSON.parse(event.data);
        // Relay tool requests and audio output from agent.
        if (msg.type === 'audio_out') {
          chrome.runtime.sendMessage({
            type: 'PLAY_AUDIO_TO_TAB',
            data: msg.data,
          });
          return;
        }

        chrome.runtime.sendMessage({
          type: 'DATA_FROM_AGENT',
          data: msg,
        });
      } catch (err) {
        console.error('[SafeNav Offscreen] Failed to parse message:', err);
      }
    };
  });
}

function stopConnection(): void {
  if (frameTimer) {
    clearInterval(frameTimer);
    frameTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  if (captureStream) {
    captureStream.getTracks().forEach((t) => t.stop());
    captureStream = null;
  }

  videoEl = null;
  canvas = null;
  ctx = null;

  console.log('[SafeNav Offscreen] Stopped');
}

// ── Frame Capture ──

function captureAndSendFrame(): void {
  if (!videoEl || !canvas || !ctx || !ws || ws.readyState !== WebSocket.OPEN) return;

  // Match video dimensions
  canvas.width = videoEl.videoWidth || 1280;
  canvas.height = videoEl.videoHeight || 720;

  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  // Convert to JPEG base64
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  const base64 = dataUrl.split(',')[1]; // strip "data:image/jpeg;base64,"

  ws.send(JSON.stringify({
    type: 'screen_frame',
    data: base64,
  }));
}

// ── Send data to agent via WebSocket ──

function sendToAgent(msg: DataChannelMessage | AudioInMessage): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[SafeNav Offscreen] WebSocket not open — cannot send data');
    return;
  }

  ws.send(JSON.stringify(msg));
}
