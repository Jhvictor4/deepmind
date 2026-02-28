# SafeNav Integration Plan

live-agent (LiveKit + Gemini) ↔ extension (브라우저 제어) 연결

## 현재 상태

### live-agent 서버 ✅
- Gemini Live API로 음성 대화 (speech-to-speech)
- 스크린 공유 프레임 수신 → Gemini에 이미지 전달
- tools 정의됨 (click, type, scroll, navigate, screenshot) — **전부 MOCK**

### extension ✅
- content script: 실제 클릭/타이핑/스크롤 실행
- Shadow DOM 바 UI (idle → connecting → active → acting)
- 오디오 캡처/재생
- service worker: 세션 관리, 메시지 중계
- **LiveKit 연결 없음** (Gemini 직접 연결 TODO 상태)

---

## 구현 작업

### 1. extension service-worker: LiveKit room 접속

**파일:** `extension/background/service-worker.ts`

- `livekit-client` SDK 추가 (CDN 또는 번들)
- `startSession()` 에서:
  - LiveKit 토큰 발급 (서버에서 받거나, 하드코딩으로 테스트)
  - `Room.connect()` 로 LiveKit room 접속
  - 스크린 공유 트랙 publish (`room.localParticipant.setScreenShareEnabled(true)`)
  - Data channel 리스너 등록 (agent → extension 명령 수신)
- `stopSession()` 에서 room disconnect

### 2. Data Channel 프로토콜 정의

agent → extension (tool 실행 요청):
```json
{
  "type": "tool_request",
  "id": "uuid",
  "tool": "clickElement",
  "params": { "x": 100, "y": 200 }
}
```

extension → agent (실행 결과):
```json
{
  "type": "tool_response",
  "id": "uuid",
  "success": true,
  "result": "Clicked at (100, 200)"
}
```

### 3. agent.ts: MOCK → Data Channel 실행

**파일:** `live-agent/src/agent.ts`

각 tool의 `execute` 함수에서:
1. `tool_request` 메시지를 data channel로 전송
2. Promise로 `tool_response` 대기 (timeout 포함)
3. 결과를 Gemini에 반환

```typescript
// 예시 구조
private async sendToolRequest(tool: string, params: object): Promise<string> {
  const id = crypto.randomUUID();
  const msg = JSON.stringify({ type: 'tool_request', id, tool, params });

  // data channel로 전송
  const room = getJobContext().room;
  const encoder = new TextEncoder();
  await room.localParticipant.publishData(encoder.encode(msg), { reliable: true });

  // 응답 대기
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Tool timeout')), 10000);
    this.pendingRequests.set(id, { resolve, reject, timeout });
  });
}
```

### 4. extension content-script: Data Channel 명령 실행

**파일:** `extension/content/content-script.ts`

service worker에서 받은 data channel 메시지를 기존 `executeAction()` 으로 전달.
이미 클릭/타이핑/스크롤 구현되어 있으므로 메시지 포맷 변환만 하면 됨.

### 5. 스크린 공유

extension에서 LiveKit room에 스크린 공유를 publish하면,
agent.ts의 `onEnter()` → `createVideoStream()` 이 자동으로 프레임을 수신함.
→ 이미 구현되어 있으므로 추가 작업 없음.

---

## 작업 순서

```
1. extension에 livekit-client 추가 + room 접속     ← 먼저
2. 스크린 공유 publish 확인                         ← agent 서버 로그로 확인
3. data channel 프로토콜 구현 (양쪽)                ← integration
4. agent.ts tools MOCK → data channel 교체         ← integration
5. E2E 테스트: 음성으로 "버튼 클릭해줘" → 실제 클릭  ← 최종 확인
```

## 필요한 것

- LiveKit 토큰 생성: extension이 room에 접속하려면 access token 필요
  - 옵션 A: live-agent 서버에 token endpoint 추가
  - 옵션 B: livekit-cli로 수동 생성 (테스트용)
  - 옵션 C: LiveKit Cloud 대시보드에서 생성
