import { Task, getJobContext, llm, voice } from '@livekit/agents';
import type { Track, VideoFrame } from '@livekit/rtc-node';
import { RoomEvent, TrackKind, VideoStream } from '@livekit/rtc-node';
import { z } from 'zod';

// ── Data Channel Protocol Types ──

interface ToolRequest {
  type: 'tool_request';
  id: string;
  tool: string;
  params: Record<string, unknown>;
}

interface ToolResponse {
  type: 'tool_response';
  id: string;
  success: boolean;
  result: string;
}

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ── Agent ──

export class Agent extends voice.Agent {
  private latestFrame: VideoFrame | null = null;
  private videoStream: VideoStream | null = null;
  private tasks: Set<Task<void>> = new Set();
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor() {
    super({
      instructions: `You are SafeNav, a kind and patient AI assistant that helps people navigate difficult websites. You speak to the user via real-time voice.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy, non-English speakers) accomplish tasks on websites that are intentionally complex or hostile.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging
- Speak in the user's preferred language
- When you can see the user's screen, describe what you see and guide them step by step

You have access to browser navigation tools. When the user asks for help with a website, use your tools to navigate and assist them.`,

      tools: {
        takeScreenshot: llm.tool({
          description: 'Capture the current browser tab screenshot to see what the user sees',
          parameters: z.object({}),
          execute: async () => {
            return this.sendToolRequest('takeScreenshot', {});
          },
        }),
        clickElement: llm.tool({
          description: 'Click at coordinates on the page',
          parameters: z.object({
            x: z.number().describe('X coordinate'),
            y: z.number().describe('Y coordinate'),
          }),
          execute: async ({ x, y }) => {
            return this.sendToolRequest('clickElement', { x, y });
          },
        }),
        typeText: llm.tool({
          description: 'Type text into the currently focused element',
          parameters: z.object({
            text: z.string().describe('Text to type'),
          }),
          execute: async ({ text }) => {
            return this.sendToolRequest('typeText', { text });
          },
        }),
        scrollPage: llm.tool({
          description: 'Scroll the page up or down',
          parameters: z.object({
            direction: z.enum(['up', 'down']).describe('Scroll direction'),
            amount: z.number().optional().describe('Pixels to scroll, default 300'),
          }),
          execute: async ({ direction, amount }) => {
            return this.sendToolRequest('scrollPage', { direction, amount: amount ?? 300 });
          },
        }),
        navigateTo: llm.tool({
          description: 'Navigate the browser to a URL',
          parameters: z.object({
            url: z.string().describe('URL to navigate to'),
          }),
          execute: async ({ url }) => {
            return this.sendToolRequest('navigateTo', { url });
          },
        }),
      },
    });
  }

  // ── Data Channel: send tool request and wait for response ──

  private async sendToolRequest(tool: string, params: Record<string, unknown>): Promise<string> {
    const id = crypto.randomUUID();
    const msg: ToolRequest = { type: 'tool_request', id, tool, params };
    const encoded = new TextEncoder().encode(JSON.stringify(msg));

    const room = getJobContext().room;

    console.log(`🔧 Sending tool request: ${tool}`, params);

    // Publish to all participants (the extension will pick it up)
    await room.localParticipant.publishData(encoded, { reliable: true });

    // Wait for response with timeout
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Tool request "${tool}" timed out after 15s`));
      }, 15_000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
    });
  }

  // ── Data Channel: handle incoming responses ──

  private handleDataReceived(payload: Uint8Array): void {
    try {
      const text = new TextDecoder().decode(payload);
      const msg = JSON.parse(text);

      if (msg.type === 'tool_response') {
        const response = msg as ToolResponse;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);

          if (response.success) {
            console.log(`✅ Tool response: ${response.result}`);
            pending.resolve(response.result);
          } else {
            console.log(`❌ Tool failed: ${response.result}`);
            pending.resolve(`Action failed: ${response.result}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse data channel message:', err);
    }
  }

  // ── Lifecycle ──

  // Subscribe to screen share / video tracks and data channel when agent enters the room
  async onEnter(): Promise<void> {
    const room = getJobContext().room;

    // Listen for data channel messages (tool responses from extension)
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      this.handleDataReceived(payload);
    });

    // Check existing participants for video tracks
    const remoteParticipants = Array.from(room.remoteParticipants.values());
    for (const participant of remoteParticipants) {
      for (const pub of participant.trackPublications.values()) {
        if (pub.track?.kind === TrackKind.KIND_VIDEO) {
          console.log(`📺 Found existing video track from ${participant.identity}`);
          this.createVideoStream(pub.track);
          break;
        }
      }
    }

    // Watch for new video tracks (screen share)
    room.on(RoomEvent.TrackSubscribed, (track: Track) => {
      if (track.kind === TrackKind.KIND_VIDEO) {
        console.log('📺 Screen share track subscribed');
        this.createVideoStream(track);
      }
    });
  }

  // Attach latest video frame to each user turn so the model can see the screen
  async onUserTurnCompleted(
    chatCtx: llm.ChatContext,
    newMessage: llm.ChatMessage,
  ): Promise<void> {
    if (this.latestFrame) {
      console.log('🖼️  Attaching screen frame to user message');
      newMessage.content.push(
        llm.createImageContent({
          image: this.latestFrame,
        }),
      );
      this.latestFrame = null;
    }
  }

  // Buffer latest video frame from screen share track
  private createVideoStream(track: Track): void {
    if (this.videoStream !== null) {
      this.videoStream.cancel();
    }

    this.videoStream = new VideoStream(track);

    const readStream = async (controller: AbortController): Promise<void> => {
      if (!this.videoStream) return;
      for await (const event of this.videoStream) {
        if (controller.signal.aborted) return;
        this.latestFrame = event.frame;
      }
    };

    const task = Task.from((controller) => readStream(controller));
    task.result.finally(() => this.tasks.delete(task));
    this.tasks.add(task);
  }
}
