# Computer Use 브라우저 에이전트 — 데모 타겟 리서치

## 컨셉
사회적 선을 위한 안전한 Computer Use 브라우저 에이전트.
- 현대화 안 된 사이트, 의도적으로 복잡하게 만든 사이트를 대신 내비게이트
- 중장년층/디지털 소외 계층 지원
- Dark Pattern에 맞서는 AI

---

## 1. 악덕 보험 사이트 (데모 후보)

### ⭐ UnitedHealthcare (uhc.com) — 1순위 추천
- 미국 최대 건강보험사
- 2024 CEO 피살 사건 이후 미국에서 가장 미움받는 보험사
- 클레임 거부율 업계 최고 수준
- 웹사이트에서 클레임 appeal 경로 찾기 극도로 어려움
- "시스템 자체가 개인이 내비게이트하기 어렵게 설계되어 있다" (Oreate AI 분석)
- UnitedHealth Group Abuse Tracker 존재 (American Economic Liberties Project)
- Trustpilot 최저 별점, ConsumerAffairs 불만 폭주

### Anthem / Elevance Health
- 구 Wellpoint
- 아픈 고객 보험 일방 해지로 악명
- 6,000명 이상 고객의 보험을 소급 취소 (retroactive cancellation)
- Appeal 프로세스가 사이트에서 깊이 묻혀있음

### Allstate
- CEO Thomas Wilson: "Our obligation is to earn a return for our shareholders"
- S&P 500 대비 2배 수익을 내면서 보험금 지급은 삭감
- 보험 해지, 비갱신, 공격적 손실방지 조치

### State Farm
- 재해 피해자 클레임 조직적 거부
- 보험금 청구 경로가 여러 단계에 걸쳐 묻혀있음

### Farmers Insurance
- 클레임 거부 및 저평가(lowballing) 이력
- 고객이 아플 때 보험 해지 사례 보고

---

## 2. 사용하기 어려운 사이트 (레거시/복잡/중장년층)

### ⭐ SSA.gov (Social Security Administration) — 감동 데모 추천
- Login.gov 본인인증이 고령자에게 극도로 어려움
- 2025년에도 "Let's verify your identity" 루프로 계정 접근 불가 사례 다수
- MySocialSecurity 포털은 기본적으로 read-only
- 메시지 전송, 검색 기능 없음
- "This is a way to kick seniors off their accounts" (Reddit)
- 실제 신청/변경은 전화 또는 방문만 가능한 경우 많음

### Healthcare.gov
- 2013 런칭 대참사로 역사에 남음
- 보험 플랜 비교/신청 플로우 여전히 복잡
- 소득 증빙, 가족 정보 입력 등 다단계 프로세스

### 각 주 DMV 사이트
- 주마다 완전히 다른 레거시 UI
- 면허 갱신, 주소 변경 경로 찾기 어려움
- 일부 주는 90년대 디자인 그대로

### 각 주 실업급여 (Unemployment) 사이트
- 코로나 때 대규모 시스템 장애로 유명
- COBOL로 작성된 백엔드가 아직 돌아가는 곳 있음
- UI가 극도로 구식

### FAFSA (studentaid.gov)
- 학자금 지원 신청
- 매년 "왜 이렇게 어렵냐" 전국적 불만
- 2024-2025 시즌 대규모 시스템 오류로 수백만 학생 피해

---

## 3. 의도적으로 기능을 숨긴 사이트 (Dark Patterns)

### 계정 삭제/탈퇴 숨김
- **Amazon**: 계정 삭제까지 7단계 이상
- **Facebook/Meta**: 삭제 vs 비활성화 혼란 유도, 30일 유예 기간에 로그인하면 복구

### 구독 해지 방해 (Roach Motel 패턴)
- **NYT**: 온라인 가입 → 해지는 전화/채팅 필요했음
- **Adobe**: 해지 시 위약금 + 복잡한 해지 플로우
- **각종 SaaS/미디어**: 가입은 1클릭, 해지는 5-7단계

### 개인정보 옵트아웃
- **데이터 브로커**: Spokeo, BeenVerified, WhitePages 등
- 개인정보 삭제 요청 경로가 의도적으로 복잡
- 각 브로커마다 다른 프로세스, 수십 개 사이트에 개별 요청 필요

### FTC "Click to Cancel" Rule 배경
- FTC가 "가입만큼 쉽게 해지" 규칙 추진
- 2025년 7월 시행 예정이었으나 8th Circuit에서 차단
- 아직 법적으로 미확정 → **규제 공백 = 에이전트의 존재 이유**

---

## 4. 데모 시나리오 제안

### 시나리오 A: "악덕 보험에 맞서는 AI"
- **타겟**: UnitedHealthcare
- **태스크**: 클레임 거부 후 appeal (이의제기) 프로세스 찾기
- **내러티브**: 미국에서 가장 미움받는 보험사 vs. 사회적 선을 위한 AI
- **임팩트**: 감정적 공감 + 실용적 가치

### 시나리오 B: "디지털 소외 해결"
- **타겟**: SSA.gov
- **태스크**: 고령자 대신 연금 혜택 확인 + 신청 가이드
- **내러티브**: 기술에 소외된 할머니/할아버지를 위한 AI
- **임팩트**: 사회적 선의 가장 직관적인 사례

### 시나리오 C: "다크 패턴 파괴자"
- **타겟**: 데이터 브로커 (Spokeo 등) 또는 Amazon 계정 삭제
- **태스크**: 숨겨진 개인정보 삭제/계정 탈퇴 경로를 에이전트가 찾아서 실행
- **내러티브**: 기업이 의도적으로 숨긴 것을 AI가 찾아줌
- **임팩트**: 프라이버시 + 소비자 권리

---

## 5. 시장 컨텍스트

### 규제 환경
- FTC Click-to-Cancel Rule 법원에서 차단됨 (2025.07)
- = 규제가 없으니 기업들이 계속 dark pattern 사용
- = **에이전트가 소비자 편에서 대신 싸워줘야 하는 이유**

### 보험업계 여론
- 61%의 온라인 보험 가입자가 dark pattern 경험 (LocalCircles 조사)
- 해지 어렵게 만드는 "subscription trap"이 가장 흔함
- UnitedHealthcare CEO 사건 이후 보험업계 전반에 대한 분노 극대화

### 기술 트렌드
- Anthropic Computer Use, OpenAI Operator 등 computer use 에이전트 급부상
- 아직 "사회적 선"에 특화된 서비스는 거의 없음
- 대부분 생산성/자동화에 포커스 → **차별화 포인트**

---

## 6. 참고 자료

- [Deceptive Patterns - Hard to Cancel](https://www.deceptive.design/types/hard-to-cancel)
- [10 Worst Insurance Companies (National Law Review)](https://natlawreview.com/article/11-worst-insurance-companies)
- [10 Worst Insurance Companies (Bachus & Schanker)](https://www.coloradolaw.net/insurance-industry-10-worst-deny-claims/)
- [UnitedHealth Abuse Tracker](https://www.economicliberties.us/data-tools/unitedhealth-group-abuse-tracker/)
- [FTC Click-to-Cancel Rule 현황](https://www.mondaq.com/unitedstates/corporate-and-company-law/1750214/)
- [Why Government Websites Fail (Code for America)](https://codeforamerica.org/news/why-government-websites-often-struggle-to-meet-peoples-needs/)
- [SSA.gov 사용성 불만 (Reddit)](https://www.reddit.com/r/SocialSecurity/comments/1jl7jf8/)
- [6 in 10 insurance users report dark patterns](https://www.localcircles.com/a/press/page/insurance-dark-patterns-survey)
