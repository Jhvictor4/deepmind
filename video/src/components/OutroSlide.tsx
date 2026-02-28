import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const OutroSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 12 } });
  const subtitleOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [40, 58], [0, 1], {
    extrapolateRight: "clamp",
  });

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
          alignItems: "center",
          gap: 28,
          zIndex: 1,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
          padding: "0 100px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 26,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 54,
            fontWeight: 900,
            color: "#fff",
          }}
        >
          HV
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 86,
            fontWeight: 800,
            margin: 0,
            textAlign: "center",
            background: `linear-gradient(135deg, ${colors.text}, ${colors.primary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          HW Validator
        </h1>

        {/* Tagline — moved from WhyGeminiSlide */}
        <p
          style={{
            opacity: subtitleOpacity,
            fontSize: 44,
            fontWeight: 700,
            color: colors.text,
            textAlign: "center",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          기존 솔루션으로는{" "}
          <span style={{ color: colors.accent }}>불가능한</span> 영역,
          <br />
          AI 에이전트가 해결합니다
        </p>

        {/* Tech stack tags */}
        <div
          style={{
            opacity: taglineOpacity,
            display: "flex",
            gap: 16,
            marginTop: 8,
          }}
        >
          {["Gemini Pro", "Multi-Agent", "Multimodal AI", "DeepPCB"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  padding: "10px 28px",
                  borderRadius: 100,
                  border: `1.5px solid ${colors.primary}40`,
                  fontSize: 30,
                  fontWeight: 500,
                  color: colors.primary,
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>

        {/* Powered by */}
        <div
          style={{
            opacity: taglineOpacity * 0.6,
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 32,
            color: colors.textMuted,
          }}
        >
          <span>Powered by</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 36,
              background: `linear-gradient(135deg, ${colors.gemini1}, ${colors.gemini2}, ${colors.gemini3}, ${colors.gemini4})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Google Gemini
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
