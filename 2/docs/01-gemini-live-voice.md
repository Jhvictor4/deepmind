# 01 — Gemini Live API 음성 에이전트

> 목표: TUI(터미널)에서 마이크 → Gemini → 스피커로 음성 대화를 검증한다.

---

## 아키텍처

```
[마이크] ──PCM 16kHz 16bit mono──▶ [Node.js TUI]
                                       │
                                 sendRealtimeInput()
                                       │
                                 [Gemini Live API]
                                 (WebSocket 양방향)
                                       │
                                 onmessage callback
                                       │
[스피커] ◀──PCM 24kHz 16bit mono── [Node.js TUI]
```

---

## 기술 스택

| 레이어 | 패키지 | 비고 |
|--------|--------|------|
| Gemini SDK | `@google/genai` | Live API WebSocket 추상화 |
| 마이크 입력 | `node-record-lpcm16` | SoX 필요 (`brew install sox`) |
| 스피커 출력 | `speaker` | node-gyp 네이티브 빌드 |
| 환경변수 | `dotenv` | `GEMINI_API_KEY` |

---

## 모델 & 설정

### 모델 ID

| Model ID | 상태 |
|----------|------|
| `gemini-2.5-flash-native-audio-preview-12-2025` | 현재 프리뷰 |
| `gemini-2.5-flash-native-audio-latest` | 최신 별칭 |

> Native audio 모델은 128k 토큰 컨텍스트, 70개 언어 자동 감지.

### 오디오 포맷

| | 입력 (마이크) | 출력 (스피커) |
|---|---|---|
| 포맷 | Raw PCM, little-endian, 16-bit signed | Raw PCM, little-endian, 16-bit signed |
| 샘플레이트 | 16,000 Hz | 24,000 Hz |
| 채널 | 1 (mono) | 1 (mono) |
| MIME | `audio/pcm;rate=16000` | — |
| 전송 | Base64 인코딩 | Base64 디코딩 |

### 음성 옵션

Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr

---

## 에이전트 페르소나 (SafeNav)

```
You are SafeNav, a kind and patient AI assistant that helps people navigate
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
with a website, use your tools to navigate and assist them.
```

---

## Function Calling (브라우저 도구 등록)

Live API는 function calling을 지원한다. 이후 Chrome Extension에서 실제 실행할 도구들을 여기 등록한다.

```typescript
const tools = [{
  functionDeclarations: [
    {
      name: 'take_screenshot',
      description: 'Capture the current browser tab screenshot',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'click_element',
      description: 'Click at coordinates on the page',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
        },
        required: ['x', 'y']
      }
    },
    {
      name: 'type_text',
      description: 'Type text into the currently focused element',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
        },
        required: ['text']
      }
    },
    {
      name: 'scroll_page',
      description: 'Scroll the page up or down',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down'] },
          amount: { type: 'number', description: 'Pixels to scroll' },
        },
        required: ['direction']
      }
    },
    {
      name: 'navigate_to',
      description: 'Navigate the browser to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' },
        },
        required: ['url']
      }
    }
  ]
}];
```

### Tool Call 처리

```typescript
onmessage: (message) => {
  if (message.toolCall) {
    for (const fc of message.toolCall.functionCalls) {
      const result = await executeBrowserAction(fc.name, fc.args);
      session.sendToolResponse({
        functionResponses: [{
          id: fc.id,
          name: fc.name,
          response: { result }
        }]
      });
    }
  }
}
```

---

## TUI 검증 코드

### 사전 준비

```bash
brew install sox          # macOS 마이크 캡처용
mkdir -p safenav-tui
cd safenav-tui
pnpm init
pnpm add @google/genai node-record-lpcm16 speaker dotenv
```

### .env

```
GEMINI_API_KEY=your-api-key-here
```

### index.ts

```typescript
import { GoogleGenAI, Modality } from '@google/genai';
import record from 'node-record-lpcm16';
import Speaker from 'speaker';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const speaker = new Speaker({
  channels: 1,
  bitDepth: 16,
  sampleRate: 24000,
  signed: true,
});

const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-latest',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: `You are SafeNav, a kind and patient AI assistant
      that helps people navigate difficult websites. Be warm and encouraging.`,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' }
      }
    },
    contextWindowCompression: { slidingWindow: {} },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  },
  callbacks: {
    onopen: () => {
      console.log('✅ Connected to Gemini Live API');
      console.log('🎤 Speak into your microphone... (Ctrl+C to quit)\n');
      startMic();
    },
    onmessage: (message) => {
      // 오디오 재생
      const parts = message.serverContent?.modelTurn?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            speaker.write(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }

      // 트랜스크립션 표시
      if (message.serverContent?.inputTranscription?.text) {
        process.stdout.write(`\r🧑 You: ${message.serverContent.inputTranscription.text}\n`);
      }
      if (message.serverContent?.outputTranscription?.text) {
        process.stdout.write(`\r🤖 SafeNav: ${message.serverContent.outputTranscription.text}\n`);
      }
    },
    onerror: (e) => console.error('❌ Error:', e.message),
    onclose: (e) => console.log('🔌 Session closed:', e.reason),
  },
});

function startMic() {
  const mic = record.record({
    sampleRate: 16000,
    channels: 1,
    audioType: 'raw',
    recorder: 'sox',
  });

  mic.stream().on('data', (chunk: Buffer) => {
    session.sendRealtimeInput({
      audio: {
        data: chunk.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      }
    });
  });
}

process.on('SIGINT', () => {
  console.log('\n👋 Closing session...');
  session.close();
  process.exit(0);
});
```

---

## 주의사항

| 항목 | 내용 |
|------|------|
| 에코 캔슬 | API에 없음. **헤드폰 필수** (스피커 쓰면 피드백 루프) |
| 세션 시간 | 15분 제한 (compression 켜면 무제한) |
| 커넥션 | ~10분마다 끊길 수 있음 → session resumption 구현 필요 |
| 응답 모달리티 | 세션당 TEXT 또는 AUDIO 하나만. 둘 다 안 됨 |
| 입출력 샘플레이트 | 입력 16kHz ≠ 출력 24kHz, 스피커 설정 주의 |
| 지원 도구 | function calling + Google Search만. Code execution, URL context 불가 |
| 언어 | Native audio 모델은 자동 감지 (수동 설정 불가) |
| SoX 설치 | macOS: `brew install sox` 필수 |
| VAD 튜닝 | 배경 소음 환경에서 `silenceDurationMs`, sensitivity 조정 필요 |

---

## 검증 체크리스트

- [ ] `brew install sox` 설치
- [ ] `GEMINI_API_KEY` 발급 및 .env 설정
- [ ] TUI 앱 실행 → 마이크 입력 확인
- [ ] Gemini 음성 응답 스피커 출력 확인
- [ ] 트랜스크립션(자막) 터미널 출력 확인
- [ ] 한국어 / 영어 자동 감지 확인
- [ ] SafeNav 페르소나 동작 확인 (따뜻하고 친절한 톤)
- [ ] function calling 등록 → tool call 수신 확인 (mock 응답)
- [ ] 15분+ 세션 유지 확인 (context compression)
- [ ] Ctrl+C graceful shutdown 확인
