import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const IntroSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 15 } });
  const poweredByOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background — no radial glow */}
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
          alignItems: "center",
          gap: 36,
          zIndex: 1,
          transform: `translateY(${interpolate(titleY, [0, 1], [60, 0])}px)`,
          padding: "0 80px",
        }}
      >
        {/* Title — solid white, no gradient clip */}
        <h1
          style={{
            fontSize: 92,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            margin: 0,
            color: colors.text,
          }}
        >
          하드웨어 검증의
          <br />
          패러다임을 바꾸다
        </h1>

        {/* Powered by — subtle */}
        <div
          style={{
            opacity: poweredByOpacity * 0.6,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 24,
            fontSize: 26,
            color: colors.textMuted,
          }}
        >
          <span>Powered by</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 30,
              background: `linear-gradient(135deg, ${colors.gemini1}, ${colors.gemini2}, ${colors.gemini3}, ${colors.gemini4})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Google Gemini
          </span>
        </div>

        {/* Hackathon tag — bottom, small */}
        <div
          style={{
            opacity: poweredByOpacity * 0.4,
            fontSize: 22,
            fontWeight: 500,
            color: colors.textMuted,
            letterSpacing: 3,
            marginTop: 8,
          }}
        >
          GEMINI 3 SEOUL HACKATHON 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
