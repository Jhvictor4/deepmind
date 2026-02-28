import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

const savings = [
  { label: "검증 시간", before: 100, after: 15, beforeLabel: "6개월", afterLabel: "10초", color: colors.primary },
  { label: "검증 비용", before: 65, after: 22, beforeLabel: "65%", afterLabel: "22%", color: colors.warning, source: "McKinsey, 2024" },
  { label: "Respin 비용", before: 80, after: 20, beforeLabel: "$10M+", afterLabel: "$1M 이하", color: colors.accent, source: "SemiAnalysis" },
  { label: "결함 탐지율", before: 40, after: 95, beforeLabel: "40%", afterLabel: "95%+", color: colors.info },
];

export const SolutionSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const barTransition = interpolate(frame, [86, 146], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "50px 90px", gap: 36, zIndex: 1 }}>
        <div style={{ opacity: headerOpacity }}>
          <div style={{ fontSize: 30, color: colors.primary, fontWeight: 600, letterSpacing: 4, marginBottom: 14 }}>OUR SOLUTION</div>
          {/* No gradient text — solid primary color */}
          <h2 style={{ fontSize: 60, fontWeight: 800, margin: 0, lineHeight: 1.2, color: colors.text }}>
            AI Agent 연합으로 <span style={{ color: colors.primary }}>4가지 핵심 지표 개선</span>
          </h2>
          <p style={{ fontSize: 34, color: colors.textSecondary, margin: "10px 0 0" }}>Gemini Multimodal + Multi-Agent Agentic Workflow</p>
        </div>

        <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "flex-end", paddingBottom: 20 }}>
          {savings.map((s, i) => {
            const delay = 20 + i * 12;
            const itemOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const maxBarHeight = 420;
            const beforeHeight = (s.before / 100) * maxBarHeight;
            const afterHeight = (s.after / 100) * maxBarHeight;
            const isHigherBetter = s.label === "결함 탐지율";
            const startH = isHigherBetter ? afterHeight * 0.3 : beforeHeight;
            const endH = isHigherBetter ? afterHeight : afterHeight;
            const currentHeight = interpolate(barTransition, [0, 1], [startH, endH], { extrapolateRight: "clamp" });
            const showAfter = barTransition > 0.8;

            // Ghost bar → filled bar transition
            const fillOpacity = interpolate(barTransition, [0, 0.8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

            return (
              <div key={i} style={{ opacity: itemOpacity, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, height: maxBarHeight + 100, justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minHeight: 70, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", top: i === 0 ? -28 : 0 }}>
                  <div style={{ fontSize: 50, fontWeight: 800, color: colors.text, opacity: 0.7 }}>{s.beforeLabel}</div>
                </div>
                {/* Bar container with ghost shadow + active bar */}
                <div style={{ width: 180, height: startH, position: "relative" }}>
                  {/* Ghost shadow of original bar */}
                  {barTransition > 0 && (
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      width: "100%",
                      height: startH,
                      borderRadius: 12,
                      border: `2px dashed ${s.color}30`,
                      background: `${s.color}08`,
                    }} />
                  )}
                  {/* Active bar */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: currentHeight,
                    borderRadius: 12,
                    border: `2px solid ${s.color}60`,
                    background: `linear-gradient(180deg, ${s.color}${showAfter ? "ff" : Math.round(fillOpacity * 200).toString(16).padStart(2, "0")}, ${s.color}${showAfter ? "99" : Math.round(fillOpacity * 100).toString(16).padStart(2, "0")})`,
                  }}>
                    {showAfter && <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 60, color: s.color, fontWeight: 800, lineHeight: 1 }}>{isHigherBetter ? "\u2191" : "\u2193"}</div>
                    </div>}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 34, fontWeight: 700, color: colors.text }}>{s.label}</div>
                  {s.source && <div style={{ fontSize: 28, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>{s.source}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
