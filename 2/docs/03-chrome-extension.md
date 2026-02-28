# 03 — Chrome Extension 설계

> 목표: SafeNav 크롬 익스텐션의 UI, 구조, 빌드 계획을 정의한다.

---

## UI 디자인

### 유휴 상태: 하단 플로팅 바

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    (유저의 웹페이지)                       │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ◆ SafeNav                              [마이크 아이콘]  │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
└─────────────────────────────────────────────────────────┘
  검은색 바, 높이 ~40px, 하단 고정
  Gemini 아이콘(◆) + "SafeNav" 텍스트
  우측에 마이크 아이콘 (비활성 = 회색)
  클릭하면 활성 상태로 전환
```

### 활성 상태: 확장된 바 + 음성 시각화

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    (유저의 웹페이지)                       │
│                                                         │
│              ┌─ 하이라이트 오버레이 ─┐                    │
│              │  [Appeal 버튼]       │ ← 에이전트가 가리킴  │
│              └─────────────────────┘                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ◆ SafeNav  ~~~∿∿∿~~~  🔴 연결됨                        │
│                                                         │
│  🤖 "Appeal 버튼을 찾았어요. 클릭할까요?"                  │
│  🧑 "네, 클릭해주세요"                                   │
│                                                         │
│  [연결 해제]                                    [설정 ⚙]  │
└─────────────────────────────────────────────────────────┘
  높이 ~120px로 확장
  음성 파형 시각화 (~~~∿∿∿~~~)
  실시간 트랜스크립션 (에이전트 + 유저)
  에이전트가 가리키는 요소에 하이라이트 오버레이
```

### 에이전트 액션 중: 오버레이 표시

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         ┌──────────────────────┐                        │
│         │  ● 클릭 중...        │ ← 빨간 점 + 펄스 애니   │
│         │  "Claims 메뉴를      │                        │
│         │   열고 있습니다"      │                        │
│         └──────────────────────┘                        │
│                                                         │
│    ╔═══════════════╗                                    │
│    ║  Claims ▼     ║ ← 클릭 대상 하이라이트 (파란 테두리) │
│    ╚═══════════════╝                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ◆ SafeNav  ~~~∿∿∿~~~  🔴  ▶ 작업 중 (3/7 단계)        │
└─────────────────────────────────────────────────────────┘
```

---

## Manifest V3 구조

```
safenav-extension/
├── manifest.json
├── background/
│   └── service-worker.ts     # Gemini API 통신 허브
├── content/
│   ├── content-script.ts     # DOM 조작 + 액션 실행
│   ├── overlay.ts            # 하이라이트 오버레이 렌더링
│   └── overlay.css           # 오버레이 스타일
├── popup/
│   └── popup.html            # 익스텐션 아이콘 클릭 시 (설정)
├── bar/
│   ├── bar.ts                # 하단 바 UI 로직
│   ├── bar.css               # 하단 바 스타일
│   └── audio-visualizer.ts   # 음성 파형 시각화
├── lib/
│   ├── gemini-live.ts        # Gemini Live API 래퍼
│   ├── screenshot.ts         # 스크린샷 캡처 유틸
│   └── actions.ts            # 브라우저 액션 실행기
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── types/
    └── index.ts              # 공유 타입 정의
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "SafeNav",
  "version": "0.1.0",
  "description": "Voice-guided browser navigation for everyone",
  "permissions": [
    "activeTab",
    "tabs",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js", "content/overlay.js"],
      "css": ["content/overlay.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

---

## 컴포넌트 상세

### 1. Background Service Worker (`service-worker.ts`)

중앙 통신 허브. Gemini API와 content script 사이를 중개한다.

```typescript
// 역할:
// 1. Gemini Live API WebSocket 세션 관리
// 2. Content script로부터 스크린샷 수신
// 3. Gemini로부터 액션 수신 → content script에 전달
// 4. 오디오 I/O 관리 (마이크 → Gemini, Gemini → 스피커)

interface SessionState {
  active: boolean;
  tabId: number | null;
  liveSession: any;  // Gemini Live API session
  taskContext: string;
}

// Content script ↔ Background 메시지 프로토콜
type Message =
  | { type: 'START_SESSION' }
  | { type: 'STOP_SESSION' }
  | { type: 'SCREENSHOT_RESULT'; data: string }  // base64
  | { type: 'EXECUTE_ACTION'; action: BrowserAction }
  | { type: 'ACTION_RESULT'; success: boolean }
  | { type: 'TRANSCRIPTION'; speaker: 'user' | 'agent'; text: string }
  | { type: 'STATUS_UPDATE'; status: string };
```

### 2. Content Script (`content-script.ts`)

유저의 웹페이지에 주입되어 액션을 실행한다.

```typescript
// 역할:
// 1. 하단 바 UI 주입 (Shadow DOM으로 격리)
// 2. 브라우저 액션 실행 (click, type, scroll)
// 3. 하이라이트 오버레이 표시
// 4. Background에서 오는 명령 수신

// Shadow DOM으로 UI 격리 (호스트 페이지 CSS 간섭 방지)
const host = document.createElement('div');
host.id = 'safenav-root';
const shadow = host.attachShadow({ mode: 'closed' });
document.body.appendChild(host);
```

### 3. 하단 바 (`bar.ts`)

Content Script가 Shadow DOM으로 주입하는 하단 바 UI.

```typescript
// 상태 머신
type BarState = 'idle' | 'connecting' | 'active' | 'acting' | 'error';

// idle: 얇은 바, 마이크 아이콘
// connecting: "연결 중..." 표시
// active: 확장된 바, 트랜스크립션 표시
// acting: 에이전트가 액션 수행 중, 진행 표시
// error: 에러 메시지 표시
```

### 4. 오디오 처리

```typescript
// 마이크 캡처 (Content Script 또는 Background에서)
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  }
});

// AudioWorklet으로 PCM 변환
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);
// ... AudioWorkletNode로 raw PCM 추출 → base64 → Gemini

// 스피커 출력 (24kHz PCM → AudioContext)
function playAudio(base64Pcm: string) {
  const pcm = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
  const float32 = new Float32Array(pcm.length / 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < float32.length; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  const buffer = audioContext.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}
```

---

## 데이터 흐름

```
[마이크]
   │ getUserMedia (16kHz PCM)
   ▼
[Content Script / Bar UI]
   │ chrome.runtime.sendMessage
   ▼
[Background Service Worker]
   │ session.sendRealtimeInput({ audio })
   ▼
[Gemini Live API]
   │
   ├──▶ 음성 응답 (24kHz PCM)
   │       │
   │       ▼
   │    [Background] → [Content Script] → [스피커 재생]
   │
   └──▶ Tool Call (take_screenshot / click / type / scroll)
           │
           ▼
        [Background] → [Content Script]
           │               │
           │            실행 + 스크린샷 캡처
           │               │
           ◄───────────────┘
           │
        sendToolResponse → [Gemini]
```

---

## 빌드 도구

```json
// package.json
{
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "zip": "cd dist && zip -r ../safenav.zip ."
  },
  "devDependencies": {
    "vite": "^7",
    "@anthropic-ai/tool-use-package": "...",
    "typescript": "^5"
  },
  "dependencies": {
    "@google/genai": "latest"
  }
}
```

> Vite + CRXJS 또는 Plasmo 같은 크롬 익스텐션 프레임워크 사용 고려.
> 해커톤이니까 vanilla TypeScript + Vite로 가볍게 시작해도 됨.

---

## 구현 우선순위 (해커톤)

### Phase 1: 최소 동작 (1.5h)
- [ ] manifest.json + 기본 구조
- [ ] Content Script로 하단 바 주입 (Shadow DOM)
- [ ] 마이크 아이콘 클릭 → "연결 중..." 상태 전환
- [ ] Background에서 Gemini Live API 연결
- [ ] 마이크 → Gemini → 스피커 음성 루프

### Phase 2: 브라우저 내비게이션 (1.5h)
- [ ] `captureVisibleTab`으로 스크린샷 캡처
- [ ] 스크린샷 → Gemini tool response로 전송
- [ ] Gemini tool call → Content Script 액션 실행
- [ ] 클릭, 타이핑, 스크롤 기본 동작

### Phase 3: UX 완성 (1h)
- [ ] 트랜스크립션(자막) 바에 표시
- [ ] 에이전트 액션 시 하이라이트 오버레이
- [ ] 작업 진행 상태 표시
- [ ] 에러 핸들링 + graceful 재연결

### Phase 4: 데모 준비 (30m)
- [ ] UHC appeal 또는 Adobe 해지 시나리오 리허설
- [ ] 백업 시나리오 준비
- [ ] 스크린 레코딩 (라이브 데모 실패 대비)

---

## 디자인 토큰

```css
:host {
  /* 색상 */
  --sn-bg: #1a1a1a;
  --sn-bg-hover: #2a2a2a;
  --sn-text: #ffffff;
  --sn-text-secondary: #999999;
  --sn-accent: #4285f4;        /* Google Blue */
  --sn-accent-glow: rgba(66, 133, 244, 0.3);
  --sn-danger: #ea4335;
  --sn-success: #34a853;

  /* 크기 */
  --sn-bar-height-idle: 40px;
  --sn-bar-height-active: 120px;
  --sn-bar-radius: 12px 12px 0 0;

  /* 타이포 */
  --sn-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --sn-font-size: 13px;

  /* 애니메이션 */
  --sn-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 보안 고려사항

1. **API 키**: `chrome.storage.local`에 저장. 코드에 하드코딩 금지
2. **크리덴셜**: 에이전트가 비밀번호 입력 필드를 읽거나 저장하지 않음
3. **권한 범위**: `activeTab`만으로 시작. 필요시만 `host_permissions` 확장
4. **Shadow DOM**: 호스트 페이지와 UI 격리
5. **Content Security Policy**: 외부 스크립트 로드 최소화
