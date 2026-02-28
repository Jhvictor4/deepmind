/**
 * SafeNav TUI — Gemini Live API 음성 대화 앱
 *
 * 마이크 입력 (PCM 16kHz) → Gemini Live API → 스피커 출력 (PCM 24kHz)
 * Function calling 도구 등록 + mock 실행 포함.
 *
 * ⚠️  헤드폰 필수! 스피커 사용 시 에코 피드백 루프가 발생합니다.
 * 사전 준비: brew install sox
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { record as recordAudio, type Recording } from 'node-record-lpcm16';
import Speaker from 'speaker';
import dotenv from 'dotenv';
import { browserTools, executeBrowserAction } from './tools.js';

dotenv.config();

// ─── Validate API Key ────────────────────────────────────────────────────────

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY가 설정되지 않았습니다.');
  console.error('   .env 파일에 GEMINI_API_KEY=your-key-here 를 추가하세요.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── SafeNav Persona ─────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are SafeNav, a kind and patient AI assistant that helps people navigate
difficult websites. You speak to the user via real-time voice.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy,
non-English speakers) accomplish tasks on websites that are intentionally
complex or hostile.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging
- Speak in the user's preferred language

You have access to browser navigation tools. When the user asks for help
with a website, use your tools to navigate and assist them.`;

// ─── Speaker (24kHz output) ──────────────────────────────────────────────────

const speaker = new Speaker({
  channels: 1,
  bitDepth: 16,
  sampleRate: 24000,
  signed: true,
});

// ─── State ───────────────────────────────────────────────────────────────────

let micRecording: Recording | null = null;

// ─── Banner ──────────────────────────────────────────────────────────────────

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║           🛡️  SafeNav Voice Assistant             ║');
console.log('║         Gemini Live API — TUI Prototype          ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  ⚠️  헤드폰을 착용하세요!                          ║');
console.log('║     스피커 사용 시 에코 피드백이 발생합니다.       ║');
console.log('║                                                  ║');
console.log('║  🎤 마이크로 말하면 SafeNav가 음성으로 응답합니다. ║');
console.log('║  🛑 종료: Ctrl+C                                  ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('⏳ Gemini Live API에 연결 중...');

// ─── Connect to Gemini Live API ──────────────────────────────────────────────

const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-latest',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: SYSTEM_INSTRUCTION,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' },
      },
    },
    contextWindowCompression: {
      slidingWindow: {},
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: browserTools,
  },
  callbacks: {
    onopen: () => {
      console.log('✅ Gemini Live API 연결 완료!');
      console.log('🎤 말씀하세요... (Ctrl+C로 종료)\n');
      startMic();
    },

    onmessage: async (message: any) => {
      // ── Audio playback ──
      const parts = message.serverContent?.modelTurn?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            speaker.write(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }

      // ── Transcription display ──
      if (message.serverContent?.inputTranscription?.text) {
        process.stdout.write(
          `\r🧑 You: ${message.serverContent.inputTranscription.text}\n`,
        );
      }
      if (message.serverContent?.outputTranscription?.text) {
        process.stdout.write(
          `\r🤖 SafeNav: ${message.serverContent.outputTranscription.text}\n`,
        );
      }

      // ── Function calling (tool calls) ──
      if (message.toolCall) {
        console.log('\n🔧 Tool call received:');
        for (const fc of message.toolCall.functionCalls) {
          console.log(`   → ${fc.name}(${JSON.stringify(fc.args)})`);
          const result = await executeBrowserAction(fc.name, fc.args);
          session.sendToolResponse({
            functionResponses: [
              {
                id: fc.id,
                name: fc.name,
                response: { result },
              },
            ],
          });
        }
        console.log('');
      }
    },

    onerror: (e: any) => {
      console.error('❌ Error:', e.message ?? e);
    },

    onclose: (e: any) => {
      console.log('🔌 세션 종료:', e.reason ?? 'unknown');
    },
  },
});

// ─── Microphone Input (16kHz PCM) ────────────────────────────────────────────

function startMic() {
  micRecording = recordAudio({
    sampleRate: 16000,
    channels: 1,
    audioType: 'raw',
    recorder: 'sox',
  });

  micRecording.stream().on('data', (chunk: Buffer) => {
    session.sendRealtimeInput({
      audio: {
        data: chunk.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  });

  micRecording.stream().on('error', (err: Error) => {
    console.error('❌ 마이크 에러:', err.message);
    console.error('   sox가 설치되어 있는지 확인하세요: brew install sox');
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function shutdown() {
  console.log('\n👋 SafeNav 세션을 종료합니다...');

  if (micRecording) {
    micRecording.stop();
    console.log('   🎤 마이크 중지');
  }

  try {
    speaker.end();
    console.log('   🔇 스피커 중지');
  } catch {
    // speaker already closed
  }

  try {
    session.close();
    console.log('   🔌 Gemini 세션 종료');
  } catch {
    // session already closed
  }

  console.log('✅ 정상 종료. 안녕히 가세요!');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
