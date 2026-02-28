# SafeNav Integration — 구현 완료

live-agent (LiveKit + Gemini) ↔ extension (브라우저 제어) Data Channel 연결 완료.

## 변경 파일

### extension/

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `livekit-client` 의존성 추가 |
| `types/index.ts` | `ToolRequest`, `ToolResponse`, `DataChannelMessage` 타입 + Message union에 `TOOL_REQUEST`, `TOOL_RESPONSE_FROM_CONTENT` 추가 |
| `background/service-worker.ts` | LiveKit Room 접속, 스크린 공유 publish, Data Channel 수신/송신, 토큰 fetch |
| `content/content-script.ts` | `handleToolRequest()` — agent tool 요청을 실제 DOM 액션으로 실행 후 응답 반환 |

### live-agent/

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `livekit-server-sdk`, `tsx` 추가 + `token-server`, `dev:all` 스크립트 |
| `src/agent.ts` | MOCK tools → `sendToolRequest()` (Data Channel publish + Promise 응답 대기) |
| `src/token-server.ts` | **(신규)** `POST /token` 엔드포인트 — extension이 LiveKit room에 접속하기 위한 access token 발급 |

## 아키텍처

```
┌──────────────────┐        LiveKit Room        ┌──────────────────────┐
│   live-agent     │  ◄───── Data Channel ─────► │   Chrome Extension   │
│   (Node.js)      │                             │   (Service Worker)   │
│                  │  ◄──── Screen Share ──────   │                     │
│  Gemini Live API │         (WebRTC)            │  Content Script      │
│  Speech-to-Speech│                             │  (DOM 액션 실행)      │
└──────────────────┘                             └──────────────────────┘
        │                                                │
        │ tool call                              tool_request (data ch)
        ▼                                                ▼
  sendToolRequest()                            handleToolRequest()
  - clickElement                               - elementFromPoint().click()
  - typeText                                   - input.value = text
  - scrollPage                                 - window.scrollBy()
  - navigateTo                                 - window.location.href
  - takeScreenshot                             - (delegate to background)
```

## Data Channel 프로토콜

### agent → extension (tool_request)
```json
{
  "type": "tool_request",
  "id": "uuid",
  "tool": "clickElement",
  "params": { "x": 100, "y": 200 }
}
```

### extension → agent (tool_response)
```json
{
  "type": "tool_response",
  "id": "uuid",
  "success": true,
  "result": "Clicked element <button> at (100, 200)"
}
```

## 실행 방법

```bash
# Terminal 1: Token 서버 + Agent 서버
cd live-agent
pnpm run dev:all
# → Token server: http://localhost:8081
# → Agent server: LiveKit room에 접속 대기

# Terminal 2: Extension 빌드
cd extension
npm run build
# → dist/ 폴더를 Chrome에 로드
# chrome://extensions → 개발자 모드 → 압축 해제된 확장 프로그램 로드
```

## E2E 흐름

1. `pnpm run dev:all` → token server (8081) + agent 시작
2. Chrome에서 extension 로드 → 아무 페이지에서 SafeNav 바 활성화
3. Extension이 `POST /token` → access token 수신
4. Extension이 `Room.connect()` → LiveKit room 접속 + 스크린 공유 publish
5. Agent가 스크린 프레임 수신 → Gemini에 이미지 전달
6. 유저 음성: "저 버튼 클릭해줘"
7. Gemini → `clickElement` tool call → Data Channel → extension
8. Content script가 `elementFromPoint(x, y).click()` 실행
9. `tool_response` → agent → Gemini가 결과 확인 후 음성 응답

## 남은 작업

- [ ] `takeScreenshot` tool: background에서 `chrome.tabs.captureVisibleTab()` 구현
- [ ] 에러 복구: Room disconnect 시 자동 재접속
- [ ] Room name 동기화: agent가 생성한 room에 extension이 정확히 접속하도록
- [ ] 오디오: LiveKit audio track으로 마이크/스피커 연결 (현재 Data Channel만 구현)
