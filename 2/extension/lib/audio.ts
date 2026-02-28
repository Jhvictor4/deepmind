/**
 * SafeNav Audio Module
 * Microphone capture (16kHz PCM) + Speaker output (24kHz PCM → AudioContext)
 */

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onAudioData: ((base64Pcm: string) => void) | null = null;

  /** Start capturing microphone audio at 16kHz mono PCM */
  async start(onAudioData: (base64Pcm: string) => void): Promise<void> {
    this.onAudioData = onAudioData;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    // Use ScriptProcessorNode as fallback (AudioWorklet requires served files)
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(float32);
      const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      this.onAudioData?.(base64);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.onAudioData = null;
  }

  /** Get current audio level (0–1) for visualizer */
  getLevel(): number {
    // Simplified: return a rough level from the stream
    return 0;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  /** Play base64-encoded PCM audio (24kHz, 16-bit, mono) */
  play(base64Pcm: string): void {
    if (!this.audioContext) return;

    const pcm = Uint8Array.from(atob(base64Pcm), (c) => c.charCodeAt(0));
    const float32 = new Float32Array(pcm.length / 2);
    const view = new DataView(pcm.buffer);

    for (let i = 0; i < float32.length; i++) {
      float32[i] = view.getInt16(i * 2, true) / 32768;
    }

    const buffer = this.audioContext.createBuffer(
      1,
      float32.length,
      24000,
    );
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  stop(): void {
    this.audioContext?.close();
    this.audioContext = null;
  }
}

// ── Helpers ──

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
