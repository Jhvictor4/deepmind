# 02 — Computer Navigation 도구 설계

> 목표: 크롬 익스텐션에서 유저 화면을 캡처하고, Gemini가 판단한 액션을 실행하는 구조를 설계한다.

---

## 핵심 원칙

1. **로컬 실행**: 리모트 브라우저 없음. 유저의 실제 크롬 탭에서 동작
2. **유저 가시성**: 에이전트가 뭘 하는지 유저가 항상 볼 수 있음
3. **기존 세션 활용**: 유저의 로그인, 쿠키, 세션이 그대로 유지됨

---

## 모델 선택

| 모델 | ID | Computer Use | 가격 (1M tokens) | 비고 |
|------|-----|-------------|-----------------|------|
| Gemini 3 Flash | `gemini-3-flash-preview` | 내장 지원 | $0.50 in / $3 out | 빠르고 저렴, 해커톤 추천 |
| Gemini 3 Pro | `gemini-3-pro-preview` | 내장 지원 | - | **3/9 deprecated** → 3.1 Pro로 이전 |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | 내장 지원 | $2 in / $12 out | 최신, 가장 정확 |
| Gemini 2.5 CU | `gemini-2.5-computer-use-preview-10-2025` | 전용 모델 | $1.25-2.50 in / $10-15 out | 레거시, 비쌈 |

> **추천**: 해커톤은 `gemini-3-flash-preview`로 시작. 정확도 부족하면 `gemini-3.1-pro-preview`로 전환.
> Gemini 3 시리즈는 별도 CU 모델 없이 내장 지원. 2.5 CU 대비 5배 저렴.

---

## 좌표 시스템

Gemini Computer Use는 **정규화된 1000x1000 그리드** (0-999)를 사용한다.
실제 픽셀 좌표로 변환 필요:

```typescript
function denormalize(x: number, y: number, screenWidth: number, screenHeight: number) {
  return {
    x: Math.round(x / 1000 * screenWidth),
    y: Math.round(y / 1000 * screenHeight),
  };
}
```

---

## 지원 액션 (14종)

| 액션 | 파라미터 | 용도 |
|------|---------|------|
| `click_at` | x, y (0-999) | 좌표 클릭 |
| `type_text_at` | x, y, text, clear_before?, press_enter? | 텍스트 입력 |
| `scroll_document` | direction (up/down/left/right) | 페이지 스크롤 |
| `scroll_at` | x, y, direction | 특정 요소 스크롤 |
| `hover_at` | x, y | 마우스 호버 (서브메뉴 등) |
| `navigate` | url | URL 이동 |
| `search` | — | 검색 홈페이지 이동 |
| `go_back` | — | 뒤로가기 |
| `go_forward` | — | 앞으로가기 |
| `open_web_browser` | — | 브라우저 열기 |
| `wait_5_seconds` | — | 동적 컨텐츠 대기 |
| `key_combination` | keys (e.g. Ctrl+A) | 키보드 단축키 |
| `drag_and_drop` | start/end coords | 드래그앤드롭 |

---

## Screenshot → Action 루프

```
┌─────────────────────────────────────────┐
│            Chrome Extension              │
│                                          │
│  1. 스크린샷 캡처 ──────────────────┐     │
│     (chrome.debugger 또는            │     │
│      captureVisibleTab)              │     │
│                                      ▼     │
│  4. 액션 실행 ◄──── [Gemini API] ◄── 2.   │
│     (CDP commands)    분석 + 판단     전송  │
│                         │                  │
│  5. 새 스크린샷 ────────┘  3. 액션 반환    │
│     (루프 반복)                             │
└─────────────────────────────────────────┘
```

### 루프 상세

1. **스크린샷 캡처**: 현재 탭의 화면을 이미지로 캡처 (1440x900 권장)
2. **Gemini 전송**: 스크린샷(PNG) + 태스크 컨텍스트를 모델에 전송 (computer_use 도구 활성화)
3. **액션 판단**: 모델이 `function_call`로 다음 액션 반환 (좌표는 0-999 정규화)
4. **액션 실행**: 좌표 디노멀라이즈 → Chrome extension이 CDP/DOM으로 실행
5. **안전 확인**: `safety_decision: "require_confirmation"` 시 유저 확인 필요
6. **반복**: 새 스크린샷을 `FunctionResponse`로 반환 → 태스크 완료까지 반복

### 예상 레이턴시 (스텝당)
- 스크린샷 캡처: ~50ms
- API 호출 (Gemini 3 Flash): ~1-3초
- 액션 실행: ~100ms
- **총: ~1-4초/스텝**

---

## 스크린샷 캡처 방법 비교

### 방법 1: `chrome.tabs.captureVisibleTab` (권장)

```typescript
// manifest.json: "permissions": ["activeTab", "tabs"]
const dataUrl = await chrome.tabs.captureVisibleTab(null, {
  format: 'jpeg',
  quality: 80  // 해상도/크기 트레이드오프
});
```

| 장점 | 단점 |
|------|------|
| 간단한 API | 보이는 영역만 캡처 |
| 권한 요구 적음 | 호출 빈도 제한 있음 |
| Manifest V3 호환 | 스크롤 아래 내용 못 봄 |

### 방법 2: `chrome.debugger` + CDP (고급)

```typescript
// manifest.json: "permissions": ["debugger"]
await chrome.debugger.attach({ tabId }, '1.3');
const { data } = await chrome.debugger.sendCommand(
  { tabId },
  'Page.captureScreenshot',
  { format: 'jpeg', quality: 80 }
);
// data = base64 encoded image
```

| 장점 | 단점 |
|------|------|
| 풀페이지 캡처 가능 | "디버거 연결됨" 바 표시 |
| 더 많은 제어 | 사용자에게 무서워 보일 수 있음 |
| 뷰포트 크기 조절 가능 | 더 복잡한 권한 |

> **해커톤 추천**: `captureVisibleTab`으로 시작. 충분함.

---

## 액션 실행 방법

### 방법 1: Content Script (DOM 조작)

```typescript
// content-script.ts — 페이지에 주입됨
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'click':
      const el = document.elementFromPoint(msg.x, msg.y);
      if (el) (el as HTMLElement).click();
      break;
    case 'type':
      const active = document.activeElement as HTMLInputElement;
      if (active) active.value = msg.text;
      // input 이벤트 발생시켜야 React 등 프레임워크가 인식
      active?.dispatchEvent(new Event('input', { bubbles: true }));
      break;
    case 'scroll':
      window.scrollBy(0, msg.direction === 'down' ? msg.amount : -msg.amount);
      break;
    case 'navigate':
      window.location.href = msg.url;
      break;
  }
  sendResponse({ ok: true });
});
```

### 방법 2: CDP `Input` 도메인 (정밀 제어)

```typescript
// background.ts — chrome.debugger 사용
async function executeAction(tabId: number, action: BrowserAction) {
  switch (action.type) {
    case 'click':
      await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
        type: 'mousePressed', x: action.x, y: action.y, button: 'left', clickCount: 1
      });
      await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: action.x, y: action.y, button: 'left', clickCount: 1
      });
      break;
    case 'type':
      for (const char of action.text) {
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyDown', text: char
        });
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyUp', text: char
        });
      }
      break;
    case 'scroll':
      await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseWheelEvent', {
        x: action.x || 0, y: action.y || 0,
        deltaX: 0, deltaY: action.direction === 'down' ? 200 : -200
      });
      break;
  }
}
```

> **해커톤 추천**: Content Script 방식으로 시작 (간단, 디버거 바 안 뜸).
> 안 되는 사이트가 있으면 CDP fallback.

---

## Gemini API 호출 구조

### Computer Use 요청 (공식 API — Gemini 3 Flash/Pro)

Gemini 3는 `computer_use` 도구를 네이티브로 지원. JSON 액션을 직접 파싱할 필요 없이
`function_call`로 구조화된 액션이 온다.

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function runAgentLoop(tabId: number, task: string) {
  const contents: any[] = [];

  // 초기 스크린샷 + 태스크
  const screenshot = await captureScreenshot(tabId);
  contents.push({
    role: 'user',
    parts: [
      { text: task },
      { inlineData: { mimeType: 'image/png', data: screenshot } }
    ]
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        tools: [{
          computerUse: { environment: 'ENVIRONMENT_BROWSER' }
        }]
      }
    });

    const candidate = response.candidates[0];
    contents.push(candidate.content);

    const functionCalls = extractFunctionCalls(candidate);
    if (functionCalls.length === 0) break; // 태스크 완료

    for (const call of functionCalls) {
      // 안전 확인이 필요한 액션 (결제, 개인정보 등)
      if (call.safetyDecision === 'require_confirmation') {
        const confirmed = await promptUser(call);
        if (!confirmed) return;
      }
      await executeAction(tabId, call);
    }

    // 새 스크린샷을 FunctionResponse로 반환
    const newScreenshot = await captureScreenshot(tabId);
    contents.push({
      role: 'user',
      parts: functionCalls.map(call => ({
        functionResponse: {
          name: call.name,
          response: { url: await getTabUrl(tabId) },
          inlineData: { mimeType: 'image/png', data: newScreenshot }
        }
      }))
    });
  }
}
```

### Live API에서 Function Calling으로 통합하는 경우

Live API 세션에서 음성 대화 중 모델이 tool call을 보내면, extension이 실행:

```typescript
// Live API onmessage handler
if (message.toolCall) {
  for (const fc of message.toolCall.functionCalls) {
    let result;
    switch (fc.name) {
      case 'take_screenshot':
        const screenshot = await captureTab();
        result = { image: screenshot };
        break;
      case 'click_element':
        await contentScript.click(fc.args.x, fc.args.y);
        result = { success: true };
        break;
      case 'type_text':
        await contentScript.type(fc.args.text);
        result = { success: true };
        break;
      // ...
    }
    session.sendToolResponse({
      functionResponses: [{ id: fc.id, name: fc.name, response: result }]
    });
  }
}
```

> **핵심 결정**: Live API (음성)가 function calling으로 스크린샷을 요청하고 액션을 지시하는 방식 vs.
> 별도 CU 모델이 screenshot→action 루프를 독립적으로 돌리는 방식.
> 해커톤에서는 **Live API function calling 방식이 더 간단**.

---

## 스크린샷 최적화

| 항목 | 권장값 | 이유 |
|------|--------|------|
| 포맷 | **PNG** | Gemini CU가 `image/png`를 기대함 |
| 해상도 | **1440 x 900** | 공식 권장 해상도 |
| 인코딩 | Base64 | API 전송용 |
| 예상 크기 | ~200-500KB per screenshot | PNG 기준 |
| 캡처 간격 | 최소 200ms | `captureVisibleTab` 레이트 리밋 |

> `captureVisibleTab`은 data URL로 반환하므로 `data:image/png;base64,` 접두사 제거 필요.

---

## 참고: 기존 크롬 익스텐션 브라우저 에이전트

### Nanobrowser (Apache-2.0) — 가장 유사한 구현체
- GitHub: https://github.com/nanobrowser/nanobrowser
- 멀티 에이전트: Planner (태스크 분해) + Navigator (액션 실행) + Validator (검증)
- React + TypeScript + Vite
- **CDP `chrome.debugger`로 스크린샷 + 액션 실행** ← SafeNav와 동일 접근
- OpenAI, Anthropic, Gemini, Ollama 지원
- 사이드패널 UI + 실시간 상태 표시

### browser-use (MIT, 79K+ stars)
- GitHub: https://github.com/browser-use/browser-use
- Playwright 기반 (리모트) — SafeNav 아키텍처와 다름
- **DOM + Vision 하이브리드** 접근: 스크린샷만이 아니라 DOM 구조도 함께 분석
- 액션 정의, 루프 디텍션, 에러 복구 패턴 참고 가능
- Python 전용

### 핵심 교훈
- Nanobrowser의 CDP 패턴 직접 참고 가능
- browser-use의 DOM 하이브리드 접근은 향후 정확도 개선 시 검토

---

## 검증 체크리스트

- [ ] `captureVisibleTab`으로 현재 탭 스크린샷 캡처 → base64 확인
- [ ] 스크린샷을 Gemini 3 Flash에 전송 → "이 화면에 뭐가 보이나요?" 응답 확인
- [ ] 모델이 반환한 좌표로 Content Script에서 클릭 실행 확인
- [ ] 텍스트 입력 → React/Angular 사이트에서 정상 인식 확인
- [ ] 스크롤 → 새 스크린샷 캡처 → 모델이 새 내용 인식 확인
- [ ] 3-5 스텝 내비게이션 루프 (예: 구글 검색 → 결과 클릭) end-to-end 확인
- [ ] Live API function calling과 연동 테스트
