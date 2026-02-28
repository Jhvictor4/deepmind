import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { IntroSlide } from "./components/IntroSlide";
import { ProblemSlide } from "./components/ProblemSlide";
import { MarketDataSlide } from "./components/MarketDataSlide";
import { RealDataSlide } from "./components/RealDataSlide";
import { SolutionSlide } from "./components/SolutionSlide";
import { WhyGeminiSlide } from "./components/WhyGeminiSlide";
import { AgentArchSlide } from "./components/AgentArchSlide";
import { AgentDemoSlide } from "./components/AgentDemoSlide";
import { ResultSlide } from "./components/ResultSlide";
import { ImpactSlide } from "./components/ImpactSlide";
import { OutroSlide } from "./components/OutroSlide";

/**
 * 60초 (30fps x 60 = 1800 프레임) 데모 영상 구조:
 *
 * 0~4s     (0-120):      인트로 타이틀
 * 4~9s     (120-270):    문제 정의
 * 9~14s    (270-420):    시장 데이터
 * 14~18s   (420-540):    실제 문서들
 * 18~23s   (540-690):    솔루션
 * 23~27s   (690-810):    Why Gemini
 * 27~32s   (810-960):    Agent 아키텍처
 * ──────────────────────────────────────────────────────
 * 32~47s   (960-1410):   Agent Demo x4 (15초 — Demo 50% 핵심)
 *   Agent 1 SYM  (960-1072)   3.7s
 *   Agent 2 SPEC (1072-1185)  3.8s
 *   Agent 3 CAD  (1185-1297)  3.7s
 *   Agent 4 VIS  (1297-1410)  3.8s
 * ──────────────────────────────────────────────────────
 * 47~52s   (1410-1560):  최종 결과
 * 52~56s   (1560-1680):  임팩트
 * 56~60s   (1680-1800):  아웃로
 */
export const HWValidatorDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0C1222" }}>
      {/* 1. Intro (0~4s) */}
      <Sequence from={0} durationInFrames={120}>
        <IntroSlide />
      </Sequence>

      {/* 2. Problem (4~9s) */}
      <Sequence from={120} durationInFrames={150}>
        <ProblemSlide />
      </Sequence>

      {/* 3. Market Data (9~14s) */}
      <Sequence from={270} durationInFrames={150}>
        <MarketDataSlide />
      </Sequence>

      {/* 4. Real Documents (14~18s) */}
      <Sequence from={420} durationInFrames={120}>
        <RealDataSlide />
      </Sequence>

      {/* 5. Solution (18~24s) */}
      <Sequence from={540} durationInFrames={180}>
        <SolutionSlide />
      </Sequence>

      {/* 6. Why Gemini (24~28s) */}
      <Sequence from={720} durationInFrames={120}>
        <WhyGeminiSlide />
      </Sequence>

      {/* 7. Outro (28~32s) */}
      <Sequence from={840} durationInFrames={120}>
        <OutroSlide />
      </Sequence>
    </AbsoluteFill>
  );
};
