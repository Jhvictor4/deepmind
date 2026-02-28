import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

const competitors = [
  {
    label: "EDA 대기업",
    names: "Synopsys · Cadence · Siemens",
    limit: "IC/칩 RTL 레벨만 — PCB·DRAM 시스템 검증 불가",
    color: colors.accent,
  },
  {
    label: "검사 장비",
    names: "Cognex · Koh Young · Instrumental",
    limit: "제조 라인 전용 하드웨어 — 설계 단계 검증 불가",
    color: colors.warning,
  },
  {
    label: "단일 LLM",
    names: "범용 GPT / Claude 단독 호출",
    limit: "복잡도 증가 시 정확도 급락 — 교차 검증 불가",
    color: colors.info,
  },
];

const advantages = [
  {
    title: "Gemini 네이티브 멀티모달",
    desc: "에러 로그 + PDF 스펙 + CAD + 실물 사진 → 하나의 모델이 동시 이해",
  },
  {
    title: "4-Agent 교차 검증",
    desc: "각 Agent가 좁은 스코프에 특화 → 단일 LLM의 한계를 구조로 극복",
  },
  {
    title: "현장 전문성",
    desc: "국내 DRAM 제조업체 검증 엔지니어 + POSTECH 컴퓨터공학과 대학원생",
  },
];

export const WhyGeminiSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill style={fullScreen}>
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: colors.bg,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "40px 64px",
          zIndex: 1,
          gap: 24,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        {/* Section tag */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
            color: colors.textMuted,
            textAlign: "center",
          }}
        >
          COMPETITIVE EDGE
        </div>

        {/* Main layout: Competitors (left) vs Us (right) */}
        <div
          style={{
            display: "flex",
            gap: 28,
            flex: 1,
            alignItems: "stretch",
          }}
        >
          {/* Left: Competitors */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: colors.textMuted,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              EXISTING SOLUTIONS
            </div>
            {competitors.map((comp, i) => {
              const compOpacity = interpolate(
                frame,
                [8 + i * 8, 20 + i * 8],
                [0, 1],
                { extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    opacity: compOpacity,
                    display: "flex",
                    gap: 16,
                    padding: "18px 24px",
                    borderRadius: 14,
                    backgroundColor: `${colors.bgAlt}`,
                    border: `1px solid ${comp.color}20`,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: colors.accent,
                      flexShrink: 0,
                      marginTop: 2,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: comp.color,
                          letterSpacing: 1,
                        }}
                      >
                        {comp.label}
                      </span>
                      <span
                        style={{
                          fontSize: 17,
                          color: colors.textMuted,
                          fontWeight: 400,
                        }}
                      >
                        {comp.names}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 19,
                        color: colors.textSecondary,
                        fontWeight: 400,
                        lineHeight: 1.4,
                      }}
                    >
                      {comp.limit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 40,
                color: colors.primary,
                opacity: interpolate(frame, [30, 40], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              →
            </div>
          </div>

          {/* Right: Our advantages */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: colors.primary,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              HW VALIDATOR
            </div>
            {advantages.map((adv, i) => {
              const advOpacity = interpolate(
                frame,
                [36 + i * 8, 48 + i * 8],
                [0, 1],
                { extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    opacity: advOpacity,
                    display: "flex",
                    gap: 16,
                    padding: "18px 24px",
                    borderRadius: 14,
                    backgroundColor: `${colors.primary}08`,
                    border: `1px solid ${colors.primary}25`,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: colors.primary,
                      flexShrink: 0,
                      marginTop: 2,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: colors.text,
                        marginBottom: 4,
                      }}
                    >
                      {adv.title}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        color: colors.textSecondary,
                        fontWeight: 400,
                        lineHeight: 1.4,
                      }}
                    >
                      {adv.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
