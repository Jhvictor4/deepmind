// SafeNav Voice Assistant - LiveKit Room Client
// Connects to a LiveKit room, publishes microphone, shares screen,
// and displays transcription data from the AI agent.

(function () {
  'use strict';

  // ── DOM Elements ──────────────────────────────────────────────────
  const livekitUrlInput = document.getElementById('livekitUrl');
  const livekitTokenInput = document.getElementById('livekitToken');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const shareScreenBtn = document.getElementById('shareScreenBtn');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const connectionCard = document.getElementById('connectionCard');
  const controlsCard = document.getElementById('controlsCard');
  const transcriptionCard = document.getElementById('transcriptionCard');
  const transcriptionLog = document.getElementById('transcriptionLog');
  const micStatus = document.getElementById('micStatus');
  const screenStatus = document.getElementById('screenStatus');
  const audioIndicator = document.getElementById('audioIndicator');

  // ── State ─────────────────────────────────────────────────────────
  let room = null;
  let isScreenSharing = false;

  // ── Status Helpers ────────────────────────────────────────────────
  function setStatus(state, text) {
    statusBadge.className = 'status-badge ' + state;
    statusText.textContent = text;
  }

  function addTranscription(sender, text, type) {
    // Remove empty state placeholder if present
    const emptyState = transcriptionLog.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + type;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = sender;

    const textDiv = document.createElement('div');
    textDiv.textContent = text;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    transcriptionLog.appendChild(messageDiv);

    // Auto-scroll to bottom
    transcriptionLog.scrollTop = transcriptionLog.scrollHeight;
  }

  function showSessionUI() {
    controlsCard.classList.add('visible');
    transcriptionCard.classList.add('visible');
  }

  function hideSessionUI() {
    controlsCard.classList.remove('visible');
    transcriptionCard.classList.remove('visible');
  }

  // ── Connect to LiveKit Room ───────────────────────────────────────
  async function connect() {
    const url = livekitUrlInput.value.trim();
    const token = livekitTokenInput.value.trim();

    if (!url || !token) {
      alert('Please enter both the LiveKit server URL and access token.');
      return;
    }

    try {
      setStatus('connecting', 'Connecting...');
      connectBtn.disabled = true;
      addTranscription('System', 'Connecting to LiveKit room...', 'system');

      // Create the LiveKit room instance
      room = new LiveKitClient.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Register event handlers before connecting
      registerRoomEvents(room);

      // Connect to the room
      await room.connect(url, token);

      setStatus('connected', 'Connected');
      addTranscription('System', 'Connected to room: ' + room.name, 'system');

      // Enable microphone
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        micStatus.textContent = 'Mic: On';
        micStatus.classList.add('active');
        audioIndicator.classList.add('active');
        addTranscription('System', 'Microphone enabled.', 'system');
      } catch (micErr) {
        console.warn('Could not enable microphone:', micErr);
        addTranscription('System', 'Warning: Could not enable microphone. ' + micErr.message, 'system');
      }

      // Update UI state
      showSessionUI();
      shareScreenBtn.disabled = false;
      disconnectBtn.disabled = false;
      connectBtn.textContent = 'Connected';

    } catch (err) {
      console.error('Connection failed:', err);
      setStatus('error', 'Connection Failed');
      addTranscription('System', 'Connection failed: ' + err.message, 'system');
      connectBtn.disabled = false;
      room = null;
    }
  }

  // ── Share Screen ──────────────────────────────────────────────────
  async function shareScreen() {
    if (!room) return;

    try {
      if (!isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(true);
        isScreenSharing = true;
        shareScreenBtn.textContent = 'Stop Sharing';
        shareScreenBtn.className = 'btn btn-danger';
        screenStatus.textContent = 'Screen: Sharing';
        screenStatus.classList.add('active');
        addTranscription('System', 'Screen sharing started.', 'system');
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
        isScreenSharing = false;
        shareScreenBtn.textContent = 'Share Screen';
        shareScreenBtn.className = 'btn btn-success';
        screenStatus.textContent = 'Screen: Off';
        screenStatus.classList.remove('active');
        addTranscription('System', 'Screen sharing stopped.', 'system');
      }
    } catch (err) {
      console.error('Screen share error:', err);
      addTranscription('System', 'Screen share error: ' + err.message, 'system');
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────
  async function disconnect() {
    if (!room) return;

    try {
      await room.disconnect();
    } catch (err) {
      console.warn('Error during disconnect:', err);
    }

    cleanupAfterDisconnect();
  }

  function cleanupAfterDisconnect() {
    room = null;
    isScreenSharing = false;

    // Reset UI
    setStatus('', 'Disconnected');
    connectBtn.disabled = false;
    connectBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      Connect
    `;
    shareScreenBtn.disabled = true;
    disconnectBtn.disabled = true;
    shareScreenBtn.textContent = 'Share Screen';
    shareScreenBtn.className = 'btn btn-success';
    micStatus.textContent = 'Mic: Off';
    micStatus.classList.remove('active');
    screenStatus.textContent = 'Screen: Off';
    screenStatus.classList.remove('active');
    audioIndicator.classList.remove('active');

    hideSessionUI();
    addTranscription('System', 'Disconnected from room.', 'system');
  }

  // ── Room Event Handlers ───────────────────────────────────────────
  function registerRoomEvents(room) {
    const RoomEvent = LiveKitClient.RoomEvent;

    // Data messages from the agent (transcription, instructions, etc.)
    room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      try {
        const decoder = new TextDecoder();
        const rawText = decoder.decode(payload);

        // Try parsing as JSON first
        try {
          const data = JSON.parse(rawText);
          if (data.type === 'transcription' || data.text) {
            const sender = data.sender || (participant ? participant.identity : 'Agent');
            const text = data.text || data.message || rawText;
            const msgType = data.role === 'user' ? 'user' : 'agent';
            addTranscription(sender, text, msgType);
          } else {
            // Generic JSON data
            const sender = participant ? participant.identity : 'Agent';
            addTranscription(sender, rawText, 'agent');
          }
        } catch {
          // Plain text message
          const sender = participant ? participant.identity : 'Agent';
          addTranscription(sender, rawText, 'agent');
        }
      } catch (err) {
        console.error('Error processing data message:', err);
      }
    });

    // Transcription events (LiveKit native transcription)
    room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      if (!segments || segments.length === 0) return;

      for (const segment of segments) {
        const isLocal = participant && participant.identity === room.localParticipant.identity;
        const sender = participant ? participant.identity : 'Unknown';
        const type = isLocal ? 'user' : 'agent';
        const text = segment.text || segment.final || '';
        if (text.trim()) {
          addTranscription(sender, text, type);
        }
      }
    });

    // Participant connected
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      addTranscription('System', participant.identity + ' joined the room.', 'system');
    });

    // Participant disconnected
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      addTranscription('System', participant.identity + ' left the room.', 'system');
    });

    // Room disconnected
    room.on(RoomEvent.Disconnected, (reason) => {
      addTranscription('System', 'Room disconnected' + (reason ? ': ' + reason : '.'), 'system');
      cleanupAfterDisconnect();
    });

    // Reconnecting
    room.on(RoomEvent.Reconnecting, () => {
      setStatus('connecting', 'Reconnecting...');
      addTranscription('System', 'Connection lost. Attempting to reconnect...', 'system');
    });

    // Reconnected
    room.on(RoomEvent.Reconnected, () => {
      setStatus('connected', 'Connected');
      addTranscription('System', 'Reconnected successfully.', 'system');
    });

    // Track subscribed (e.g., audio from agent)
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === LiveKitClient.Track.Kind.Audio) {
        // Attach audio element so we can hear the agent
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        addTranscription('System', 'Audio from ' + participant.identity + ' is now playing.', 'system');
      }
    });

    // Track unsubscribed
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });

    // Local track published
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      const source = publication.source;
      if (source === LiveKitClient.Track.Source.ScreenShare) {
        addTranscription('System', 'Screen share track published.', 'system');
      }
    });

    // Local track unpublished
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      const source = publication.source;
      if (source === LiveKitClient.Track.Source.ScreenShare) {
        isScreenSharing = false;
        shareScreenBtn.textContent = 'Share Screen';
        shareScreenBtn.className = 'btn btn-success';
        screenStatus.textContent = 'Screen: Off';
        screenStatus.classList.remove('active');
        addTranscription('System', 'Screen share ended.', 'system');
      }
    });
  }

  // ── Event Listeners ───────────────────────────────────────────────
  connectBtn.addEventListener('click', connect);
  disconnectBtn.addEventListener('click', disconnect);
  shareScreenBtn.addEventListener('click', shareScreen);

  // Allow pressing Enter in the token field to connect
  livekitTokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      connect();
    }
  });

  // Warn before leaving if connected
  window.addEventListener('beforeunload', (e) => {
    if (room) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
})();
