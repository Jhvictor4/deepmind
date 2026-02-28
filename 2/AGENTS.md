# 🛡️ SafeNav — Voice-Guided Browser Agent for Social Good

> Gemini 3 Seoul Hackathon (2026-02-28) — Build Brief & Agent Instructions

---

## 🎯 One-Liner

**"Voice + Computer Use로 적대적 UI를 대신 내비게이트하는 에이전트. 보험 클레임 거부부터 계정 삭제까지, 디지털 약자 편에 선 AI."**

English: "We use Gemini's real-time voice + computer use to navigate hostile UIs on behalf of vulnerable users — starting with US healthcare insurance appeals."

---

## 1. Pain Points (검증된 실제 사례)

### 🔴 보험 (미국) — 킬러 데모 타겟
- UnitedHealthcare: 연간 수억 건 클레임 거부, appeal 프로세스 의도적으로 복잡
- 실제 Reddit 사례: 출산비 $30K 거부 (in-network 확인했는데 out-of-network 처리), 암 치료 거부
- Appeal 3단계: 1차(거의 자동 거부) → 2차(서류 추가) → 3차(외부 독립 심사)
- **각 단계마다 시간 제한** — 놓치면 끝
- 61%의 온라인 보험 가입자가 dark pattern 경험 (LocalCircles 조사)

### 🟡 구독 해지 / 계정 삭제
- Adobe: 해지 시 위약금 + 7단계 플로우, FTC가 실제로 고소 (2024)
- NYT: 디지털 구독 해지가 "은행 영업시간에만 가능" (Reddit 바이럴)
- Amazon: 계정 삭제 7단계+

### 🟢 정부/공공 서비스
- SSA.gov: Login.gov 인증이 고령자에게 극도로 어려움, 포털은 read-only
- Healthcare.gov: 26살 되어서 부모 보험 빠진 사람이 "울면서 가입 시도" (Reddit)
- FAFSA: 매년 전국적 불만

### 🔵 규제 공백 = 존재 이유
- FTC Click-to-Cancel Rule 법원에서 차단됨 (2025.07)
- 규제 없음 → 기업이 계속 dark pattern 사용 → **에이전트가 소비자 편에서 대신 싸워야**

---

## 2. 심사위원 공략 맵

### 1라운드 (VC 7 + 빌더 2) — "투자할 만한가?"

| 심사위원 | 소속 | 공략 키워드 |
|---------|------|-----------|
| John Jung | SBVA ($2B AUM) | 스케일, 글로벌 |
| Jinhyuk Jung | Atinum (270개 투자) | AI vertical, 본질가치 |
| Hyunsik Kim | SBI Investment | 수익모델, 성장 |
| Joe Shin | Stonebridge(?) | 한국 VC |
| Namwoo Lee | FuturePlay (185개) | 초기, 기술 기반, 빌더 |
| Clara Yoo | Strong Ventures (LA+서울) | 한국→글로벌 진출 |
| Sungmin Yang | Mashup Ventures (206개) | 초기, 시장 크기 |
| Sangyoon Yu | AIM Intelligence CEO | **AI 보안** → "안전한 CU" 강조 |
| Daniel Hong | Dogecoin Engineer | 실제 작동 데모, 엔지니어 눈 |

**1라운드 핵심:** 시장성 + 비전 + 작동하는 데모. 기술 깊이보다 "이거 큰 시장이다"

### 파이널 (DeepMind 2 + VC 3 + 산업 2 + 헬스케어 1)

| 심사위원 | 소속 | 공략 키워드 |
|---------|------|-----------|
| Amit Vadi | DeepMind Head of Community | Gemini API 활용도 |
| Joana Carrasqueira | DeepMind DevRel/Product | 제품 완성도, UX, 데모 퀄리티 |
| Sukone Hong | AttentionX/BlueBrown VC | 젊은 빌더, 실행력, AI 스타트업 |
| Chang Hyun Baek | Han River Partners ($100M) | 한국→글로벌, cross-border |
| Sungmin Yang | Mashup Ventures | 초기 성장, 팀 |
| Hyungseok Kim | 프로듀서/작곡가 (레전드) | **스토리텔링, "왜 만드는지"** |
| Samseog Ko | 전 방통위원, 동국대 교수 | **사회적 선, 디지털 포용, 공공성** |
| Adlar Kim | Enolink CEO (헬스케어 AI) | **보험 도메인 직격, 의료 접근성** |

**파이널 핵심:** Gemini 활용 (DeepMind) + 사회적 임팩트 스토리 (고삼석, 김형석) + 보험 도메인 공감 (Adlar Kim)

---

## 3. 피칭 프레임

### 30초 엘리베이터 피치
> "미국에서 매년 수억 건의 보험 클레임이 거부됩니다. Appeal하면 절반 이상 뒤집히지만, 프로세스가 의도적으로 복잡해서 대부분 포기합니다. SafeNav는 Gemini의 실시간 음성 + Computer Use를 결합해서, 사용자와 대화하면서 이 적대적 UI를 대신 내비게이트합니다. 보험 appeal뿐 아니라, 키오스크, 모바일, 모든 어려운 웹 UI로 확장 가능합니다."

### 확장 비전 (VC용)
- 보험 appeal → 구독 해지 → 계정 삭제 → 정부 서비스 → **모든 적대적/복잡한 UI**
- 키오스크, 모바일, 크롬 확장 전부 포함
- B2C: 월 구독 (개인) / B2B: 고객센터 자동화 (기업)
- TAM: 미국 보험만 해도 연간 수십억 달러 규모의 appeal 시장

### 감성 훅 (김형석, 고삼석용)
> "할머니가 보험 거부당했는데, 웹사이트에서 appeal 버튼을 못 찾아서 포기합니다. 우리는 할머니 옆에 앉아서 '여기 클릭하세요, 제가 도와드릴게요'라고 말하는 AI를 만듭니다."

---

## 4. 인프라 설계

### 아키텍처 개요

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   User       │◄──────────────────►│   Orchestrator   │
│  (Browser)   │  audio stream      │   (Python/Node)  │
│  - mic input │  + UI state        │                  │
│  - speaker   │                    │  ┌─────────────┐ │
│  - screen    │                    │  │ Gemini Live  │ │
│              │                    │  │ API Session  │ │
│              │                    │  │ (voice+tool) │ │
│              │                    │  └──────┬──────┘ │
│              │                    │         │        │
│              │                    │  ┌──────▼──────┐ │
│              │                    │  │ Playwright   │ │
│              │                    │  │ Browser      │ │
│              │                    │  │ (headless)   │ │
│              │                    │  └─────────────┘ │
└─────────────┘                    └──────────────────┘
```

### 핵심 컴포넌트 3개

#### #1 — Gemini Live API (실시간 음성)
- **역할:** 사용자와 실시간 음성 대화 (양방향)
- **API:** `gemini-3-live` (또는 `gemini-2.0-flash-live-001`)
- **기능:** 
  - 실시간 audio stream (mic → Gemini → speaker)
  - Barge-in 지원 (사용자가 언제든 끼어들기 가능)
  - Tool use (function calling) 지원 — 브라우저 액션 트리거
  - 24개 언어 지원
- **연결:** WebSocket 기반
- **오픈소스 참고:**
  - `jsalsman/gemini-live` — 브라우저 기반 Gemini Live SPA
  - Google 공식 Live API SDK (`@google/genai` JS, `google-genai` Python)

#### #2 — Computer Use (브라우저 자동화)
- **역할:** Gemini가 판단한 UI 액션을 실제 브라우저에서 실행
- **모델:** `gemini-2.5-computer-use-preview-10-2025` (또는 최신 CU 모델)
- **도구:** Google ADK `ComputerUseToolset` + Playwright
- **동작 루프:**
  1. 스크린샷 캡처 → Gemini에 전송
  2. Gemini가 분석 → `function_call` 반환 (click, type, scroll 등)
  3. Playwright가 액션 실행
  4. 새 스크린샷 캡처 → 반복
- **오픈소스:**
  - Google ADK (`google-adk`) — Apache 2.0
  - `ComputerUseToolset` + `PlaywrightComputer` 내장
  - `browser-use/browser-use` — MIT 라이선스, Playwright 기반

#### #3 — 두 시스템 연결 (Orchestrator)
- **핵심 문제:** Live API(음성)와 Computer Use(브라우저)는 별도 세션
- **해결 방법:**

```
Option A: Single Gemini Session (이상적)
─────────────────────────────────────────
- Live API 세션에 function_calling으로 브라우저 툴 등록
- Gemini가 음성 대화 중 필요시 tool_call로 브라우저 액션 호출
- Orchestrator가 tool_call 받아서 Playwright 실행 → 결과 반환
- Live API docs: "Tool use: Integrates tools like function calling"
- 장점: 단일 컨텍스트, 자연스러운 대화
- 단점: Live API + CU 모델 호환 여부 확인 필요

Option B: Dual Session + Shared State (안전한 대안)
─────────────────────────────────────────────────────
- Session 1: Live API (음성 대화) — 사용자 의도 파악
- Session 2: Computer Use API (브라우저) — UI 액션 수행
- Orchestrator가 두 세션 사이 메시지 중개
  - Live에서 "appeal 버튼 찾아줘" → Orchestrator → CU에 태스크 전달
  - CU 결과 (스크린샷, 상태) → Orchestrator → Live에 컨텍스트 주입
- 장점: 각 모델 최적 활용, 안정적
- 단점: 레이턴시 약간 증가, 구현 복잡도 ↑
```

### 기술 스택 (전부 오픈소스 가능)

| 레이어 | 기술 | 라이선스 |
|--------|------|---------|
| Voice Stream | Gemini Live API (WebSocket) | Google API (무료 크레딧) |
| Audio I/O (브라우저) | Web Audio API + MediaRecorder | 브라우저 빌트인 |
| Audio I/O (서버) | `mic` + `speaker` (Node.js) | MIT |
| Computer Use | Google ADK `ComputerUseToolset` | Apache 2.0 |
| Browser Engine | Playwright (Chromium) | Apache 2.0 |
| Orchestrator | Python (FastAPI) or Node.js | MIT |
| Frontend | React/Next.js 또는 vanilla HTML | - |
| 대안 Browser Agent | `browser-use/browser-use` | MIT |

### 최소 동작 플로우 (데모용)

```python
# Pseudocode — Orchestrator

# 1. Gemini Live API 세션 시작 (음성)
live_session = genai.LiveSession(
    model="gemini-3-live",  # 또는 최신 모델
    tools=[browser_navigate, browser_click, browser_type, take_screenshot],
    system_instruction=SYSTEM_PROMPT
)

# 2. 사용자 마이크 스트림 연결
live_session.connect_audio(user_mic_stream)

# 3. Gemini가 tool_call 할 때마다 Playwright 실행
async for event in live_session:
    if event.type == "tool_call":
        result = await execute_browser_action(event.function_call)
        screenshot = await take_screenshot()
        live_session.send_tool_response(result, screenshot)
    elif event.type == "audio":
        play_to_user(event.audio)

# 4. Browser action executor
async def execute_browser_action(call):
    if call.name == "click":
        await page.mouse.click(call.args.x, call.args.y)
    elif call.name == "type":
        await page.keyboard.type(call.args.text)
    elif call.name == "scroll":
        await page.mouse.wheel(0, call.args.delta_y)
    elif call.name == "navigate":
        await page.goto(call.args.url)
    return await page.screenshot()
```

### System Prompt (에이전트 성격)

```
You are SafeNav, a kind and patient AI assistant that helps people navigate 
difficult websites. You speak to the user via real-time voice while controlling 
a browser on their behalf.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy, 
non-English speakers) accomplish tasks on websites that are intentionally 
complex or hostile.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials — guide them to enter it themselves
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging — many users are frustrated or scared
- Speak in the user's preferred language

CURRENT TASK: [injected by orchestrator]
```

---

## 5. 데모 시나리오

### Primary Demo: UnitedHealthcare Appeal
1. 사용자 (음성): "보험 클레임이 거부됐어요. 어떻게 해야 하나요?"
2. SafeNav (음성): "도와드릴게요. UnitedHealthcare 사이트로 이동합니다. 잠시만요."
3. [브라우저: uhc.com 접속, 로그인 페이지 도달]
4. SafeNav: "로그인이 필요해요. 아이디와 비밀번호를 입력해주시겠어요?"
5. [사용자가 직접 입력 — 에이전트는 credential 안 건드림]
6. SafeNav: "로그인됐어요. Claims 메뉴를 찾고 있습니다..."
7. [브라우저: Claims → Denied Claims → Appeal 경로 내비게이트]
8. SafeNav: "Appeal 양식을 찾았어요. 거부 사유를 알려주시면 같이 작성해드릴게요."

### Secondary Demo: Adobe 구독 해지
- 더 짧고 임팩트 있음: "구독 해지하고 싶어요" → 7단계 dark pattern을 에이전트가 뚫는 걸 실시간으로 보여줌

---

## 6. 해커톤 실행 계획

### Phase 1 (3시간): 인프라 세팅
- [ ] Gemini Live API 세션 연결 (WebSocket + audio)
- [ ] Playwright 브라우저 세팅
- [ ] 기본 Orchestrator (Live API ↔ Playwright 연결)

### Phase 2 (3시간): 코어 루프
- [ ] 음성 입력 → Gemini 해석 → tool_call → Playwright 실행 → 스크린샷 피드백
- [ ] System prompt 튜닝
- [ ] 에러 핸들링 (페이지 로딩, 팝업 등)

### Phase 3 (2시간): 데모 & 프레젠테이션
- [ ] UHC appeal 데모 녹화/연습
- [ ] 프레젠테이션 슬라이드 (피치 프레임 기반)
- [ ] 라이브 데모 준비 (백업: 녹화 영상)

### 리스크 & 백업
- **Live API + CU 모델 호환 안 되면:** Option B (Dual Session) 전환
- **UHC 사이트 접속 안 되면:** Adobe 해지 데모로 전환
- **음성 인식 불안정하면:** 텍스트 입력 폴백 UI 준비

---

## 7. 참고 링크

### Gemini API Docs
- Live API: https://ai.google.dev/gemini-api/docs/live
- Live API Tools: https://ai.google.dev/gemini-api/docs/live-tools
- Computer Use: https://ai.google.dev/gemini-api/docs/computer-use
- Google ADK: https://google.github.io/adk-docs/

### 오픈소스 참고
- Google ADK Computer Use: https://google.github.io/adk-docs/tools/gemini-api/computer-use/
- browser-use: https://github.com/browser-use/browser-use (MIT)
- Gemini Live SPA: https://github.com/jsalsman/gemini-live

### 리서치 소스
- UnitedHealth Abuse Tracker: https://www.economicliberties.us/data-tools/unitedhealth-group-abuse-tracker/
- Dark Patterns - Hard to Cancel: https://www.deceptive.design/types/hard-to-cancel
- Insurance Dark Patterns Survey (61%): https://www.localcircles.com/a/press/page/insurance-dark-patterns-survey
- FTC Click-to-Cancel 현황: https://www.mondaq.com/unitedstates/corporate-and-company-law/1750214/

---

## 코드 에이전트 지시사항

위 설계를 기반으로 구현하되, 다음 우선순위로:

1. **먼저 Live API + tool calling이 Computer Use와 단일 세션으로 동작하는지 확인** (Option A 시도)
2. 안 되면 **Dual Session (Option B)** 으로 즉시 전환
3. **데모는 최소 하나의 시나리오가 end-to-end로 동작**해야 함
4. 모든 의존성은 **오픈소스 또는 Google 공식 API**만 사용
5. 프론트엔드는 **최소한** — 동작하는 데모가 예쁜 UI보다 중요
