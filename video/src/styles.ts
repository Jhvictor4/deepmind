import { CSSProperties } from "react";

// Production-level color palette — enterprise, not "vibey"
export const colors = {
  // Backgrounds
  bg: "#0C1222",
  bgAlt: "#111A2E",
  bgCard: "rgba(255,255,255,0.04)",

  // Primary palette — refined teal/cyan
  primary: "#00D4AA",
  primaryDim: "#00D4AA40",

  // Accent — soft warm coral
  accent: "#FF7170",
  accentDim: "#FF717030",

  // Warning — clean amber
  warning: "#FFB547",
  warningDim: "#FFB54730",

  // Info — cool blue
  info: "#5B9CF6",
  infoDim: "#5B9CF630",

  // Text
  text: "#F0F4F8",
  textSecondary: "#C1CBD8",
  textMuted: "#7A869A",

  // Structural
  border: "rgba(255,255,255,0.06)",
  divider: "rgba(255,255,255,0.08)",

  // Gemini gradient
  gemini1: "#4285F4",
  gemini2: "#EA4335",
  gemini3: "#FBBC04",
  gemini4: "#34A853",
};

export const fullScreen: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.bg,
  fontFamily:
    "'SF Pro Display', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
  color: colors.text,
  overflow: "hidden",
};
