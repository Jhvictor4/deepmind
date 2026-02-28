import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const ImpactSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const donutProgress = interpolate(frame, [15, 60], [0, 1], { extrapolateRight: "clamp" });

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const koreaShare = 9.3;
  const strokeDashoffset = circumference - (circumference * koreaShare * donutProgress) / 100;

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />

      <div style={{ display: "flex", width: "100%", height: "100%", padding: "44px 80px", gap: 50, zIndex: 1, alignItems: "center" }}>
        {/* Left: Donut + Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, flexShrink: 0, width: 380 }}>
          {/* Header above donut */}
          <div style={{ opacity: headerOpacity, textAlign: "center" }}>
            <div style={{ fontSize: 24, color: colors.primary, fontWeight: 600, letterSpacing: 4, marginBottom: 8 }}>MARKET OPPORTUNITY</div>
            <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2 }}>
              반도체 <span style={{ color: colors.primary }}>검증</span> 시장
            </div>
          </div>

          <svg width="320" height="320" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r={radius} fill="none" stroke={colors.divider} strokeWidth="28" />
            <circle cx="160" cy="160" r={radius} fill="none" stroke={colors.primary} strokeWidth="28" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 160 160)" />
            <text x="160" y="148" textAnchor="middle" fill={colors.primary} fontSize="60" fontWeight="900" fontFamily="SF Pro Display, sans-serif">9.3%</text>
            <text x="160" y="188" textAnchor="middle" fill={colors.textSecondary} fontSize="24" fontFamily="SF Pro Display, sans-serif">Korea Global Share</text>
          </svg>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, color: colors.textSecondary }}>한국 반도체 검증 장비 글로벌 점유율</div>
            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>Fortune Business Insights</div>
          </div>
        </div>

        {/* Right: Key numbers */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
          <div style={{ opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: colors.primary, lineHeight: 1 }}>$39.2B</div>
              <div style={{ fontSize: 32, color: colors.textMuted }}>{"-> "}<span style={{ color: colors.primary, fontWeight: 700 }}>$75.2B</span> (2034)</div>
            </div>
            <div style={{ fontSize: 28, color: colors.textSecondary, marginTop: 8 }}>글로벌 반도체 검증 시장 (CAGR 7.5%)</div>
            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>Source: Custom Market Insights, 2025</div>
          </div>

          <div style={{ opacity: interpolate(frame, [28, 43], [0, 1], { extrapolateRight: "clamp" }) }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: colors.warning, lineHeight: 1 }}>$29.2B</div>
            <div style={{ fontSize: 28, color: colors.textSecondary, marginTop: 8 }}>한국 반도체 장비 투자 (2026)</div>
            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>Source: SEMI / SEMICON Korea 2025</div>
          </div>

          <div style={{ opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" }) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: colors.info, lineHeight: 1 }}>$141.9B</div>
            </div>
            <div style={{ fontSize: 28, color: colors.textSecondary, marginTop: 8 }}>한국 반도체 수출 — 전체 수출의 20.8%</div>
            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>Source: InvestKOREA, 2024</div>
          </div>

          <div style={{ opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" }), fontSize: 30, color: colors.textSecondary, lineHeight: 1.4 }}>
            AI 도입 시 검증 R&D 비용 <span style={{ color: colors.primary, fontWeight: 800, fontSize: 36 }}>28~32% 절감</span> 가능
            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 6 }}>McKinsey Semiconductor Design & Manufacturing, 2024</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
