/**
 * SafeNav Offscreen Document
 *
 * Runs in an offscreen document context (has DOM APIs, unlike service worker).
 * Responsibilities:
 * 1. Connect to LiveKit room
 * 2. Capture tab via chrome.tabCapture streamId → MediaStream
 * 3. Publish video track (screen share) to LiveKit room
 * 4. Relay data channel messages (tool requests/responses) via chrome.runtime
 */

import { Room, RoomEvent, Track, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';
import type { DataChannelMessage } from '../types';

let livekitRoom: Room | null = null;

// ── Message Handler (from service worker) ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'OFFSCREEN_START': {
      const { streamId, livekitUrl, token } = message;
      startLiveKit(livekitUrl, token, streamId)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true; // async
    }

    case 'OFFSCREEN_STOP': {
      stopLiveKit();
      sendResponse({ ok: true });
      return false;
    }

    case 'OFFSCREEN_SEND_DATA': {
      // Forward data channel message to LiveKit (tool response from content script)
      sendDataToRoom(message.data);
      sendResponse({ ok: true });
      return false;
    }
  }
});

// ── LiveKit Connection + Tab Capture ──

async function startLiveKit(url: string, token: string, streamId: string): Promise<void> {
  // 1. Get MediaStream from tabCapture streamId
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false, // audio goes through mic, not tab capture
    video: {
      // @ts-expect-error — mandatory constraint for tabCapture streamId
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  });

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('No video track from tab capture');
  }

  console.log('[SafeNav Offscreen] Tab capture video track obtained');

  // 2. Connect to LiveKit room
  livekitRoom = new Room();

  // Listen for data channel messages from agent
  livekitRoom.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(payload);
      const msg: DataChannelMessage = JSON.parse(text);

      // Relay to service worker → content script
      chrome.runtime.sendMessage({
        type: 'DATA_FROM_AGENT',
        data: msg,
      });
    } catch (err) {
      console.error('[SafeNav Offscreen] Failed to parse data:', err);
    }
  });

  livekitRoom.on(RoomEvent.Disconnected, () => {
    console.log('[SafeNav Offscreen] LiveKit disconnected');
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_DISCONNECTED' });
  });

  await livekitRoom.connect(url, token);
  console.log('[SafeNav Offscreen] Connected to room:', livekitRoom.name);

  // 3. Publish the tab capture video track
  const localTrack = new LocalVideoTrack(videoTrack);
  await livekitRoom.localParticipant.publishTrack(localTrack, {
    name: 'screen-share',
    source: Track.Source.ScreenShare,
  });

  console.log('[SafeNav Offscreen] Screen share track published');
}

function stopLiveKit(): void {
  if (livekitRoom) {
    livekitRoom.disconnect();
    livekitRoom = null;
  }
  console.log('[SafeNav Offscreen] Stopped');
}

function sendDataToRoom(msg: DataChannelMessage): void {
  if (!livekitRoom) {
    console.warn('[SafeNav Offscreen] No room — cannot send data');
    return;
  }

  const encoded = new TextEncoder().encode(JSON.stringify(msg));
  livekitRoom.localParticipant.publishData(encoded, { reliable: true });
}
