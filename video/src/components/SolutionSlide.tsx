import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

const savings = [
  { label: "검증 시간", before: 100, after: 2, beforeLabel: "6개월", afterLabel: "10초", color: colors.primary },
  { label: "검증 비용", before: 65, after: 22, beforeLabel: "65%", afterLabel: "22%", color: colors.warning, source: "McKinsey, 2024" },
  { label: "Respin 비용", before: 10, after: 1, beforeLabel: "$10M+", afterLabel: "$1M 이하", color: colors.accent, source: "SemiAnalysis" },
  { label: "결함 탐지율", before: 40, after: 95, beforeLabel: "40%", afterLabel: "95%+", color: colors.info },
];

export const SolutionSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const barTransition = interpolate(frame, [50, 110], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "50px 90px", gap: 36, zIndex: 1 }}>
        <div style={{ opacity: headerOpacity }}>
          <div style={{ fontSize: 24, color: colors.primary, fontWeight: 600, letterSpacing: 4, marginBottom: 14 }}>OUR SOLUTION</div>
          {/* No gradient text — solid primary color */}
          <h2 style={{ fontSize: 54, fontWeight: 800, margin: 0, lineHeight: 1.2, color: colors.text }}>
            AI Agent 연합으로 <span style={{ color: colors.primary }}>4가지 핵심 지표 개선</span>
          </h2>
          <p style={{ fontSize: 28, color: colors.textSecondary, margin: "10px 0 0" }}>Gemini Multimodal + Multi-Agent Agentic Workflow</p>
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
                <div style={{ textAlign: "center", minHeight: 70 }}>
                  {!showAfter ? (
                    <div style={{ fontSize: 44, fontWeight: 800, color: colors.text, opacity: 0.7 }}>{s.beforeLabel}</div>
                  ) : (
                    <div style={{ fontSize: 48, fontWeight: 900, color: s.color }}>{s.afterLabel}</div>
                  )}
                </div>
                {/* Ghost outline bar → fills with color */}
                <div style={{
                  width: 180,
                  height: currentHeight,
                  borderRadius: 12,
                  border: `2px solid ${s.color}${showAfter ? "00" : "60"}`,
                  background: showAfter
                    ? `linear-gradient(180deg, ${s.color}, ${s.color}99)`
                    : `${s.color}${Math.round(fillOpacity * 25).toString(16).padStart(2, "0")}`,
                  position: "relative",
                  transition: "border 0.3s",
                }}>
                  {showAfter && !isHigherBetter && <div style={{ position: "absolute", top: -44, left: "50%", transform: "translateX(-50%)", fontSize: 30, color: s.color, fontWeight: 800 }}>{"\u2193"}</div>}
                  {showAfter && isHigherBetter && <div style={{ position: "absolute", top: -44, left: "50%", transform: "translateX(-50%)", fontSize: 30, color: s.color, fontWeight: 800 }}>{"\u2191"}</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>{s.label}</div>
                  {s.source && <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>{s.source}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
