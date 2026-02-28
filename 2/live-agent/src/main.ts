import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  metrics,
  voice,
} from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Agent } from './agent';

dotenv.config({ path: '.env.local' });

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    // Gemini Live API — speech-to-speech, no separate STT/TTS needed
    // Korean auto-detected, 70 languages supported
    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: 'Kore',
        temperature: 0.8,
      }),
      vad: ctx.proc.userData.vad! as silero.VAD,
    });

    // Metrics collection
    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    ctx.addShutdownCallback(async () => {
      const summary = usageCollector.getSummary();
      console.log(`Usage: ${JSON.stringify(summary)}`);
    });

    await session.start({
      agent: new Agent(),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();

    session.generateReply({
      instructions:
        'Greet the user warmly in Korean. Introduce yourself as SafeNav(세이프내브), and let them know you are here to help them navigate any website they find difficult. Ask what website they need help with today.',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'safenav-agent',
  }),
);
