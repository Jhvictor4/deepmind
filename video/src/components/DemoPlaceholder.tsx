import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const DemoPlaceholder: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Pulsing border
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Progress dots animation
  const dotCount = Math.floor(frame / 20) % 4;
  const dots = ".".repeat(dotCount);

  return (
    <AbsoluteFill style={fullScreen}>
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />

      <div
        style={{
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          zIndex: 1,
          width: "100%",
          height: "100%",
          padding: 80,
        }}
      >
        {/* Dashed border frame */}
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `4px dashed ${colors.primary}${Math.round(pulse * 255).toString(16).padStart(2, "0")}`,
            borderRadius: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {/* Play icon */}
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke={colors.primary} strokeWidth="3" opacity={0.4} />
            <polygon points="38,25 38,75 78,50" fill={colors.primary} opacity={0.6} />
          </svg>

          <div style={{ fontSize: 48, fontWeight: 800, color: colors.text, textAlign: "center" }}>
            데모 비디오 삽입 예정
          </div>

          <div style={{ fontSize: 28, color: colors.textSecondary, textAlign: "center", lineHeight: 1.6, maxWidth: 800 }}>
            실제 UI에서 4개 파일을 드래그 앤 드롭하고
            <br />
            Agent가 순차적으로 분석하여 결과가 나오는 과정
          </div>

          <div style={{ fontSize: 24, color: colors.textMuted, textAlign: "center" }}>
            예상 소요: Input Upload (3s) → Agent Processing (7s) → Result (5s)
          </div>

          <div style={{ fontSize: 32, color: colors.primary, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            [ DEMO VIDEO — 15s ]{dots}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
