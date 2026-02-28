import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const MarketDataSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const barProgress = interpolate(frame, [30, 80], [0, 1], { extrapolateRight: "clamp" });
  const ruleOpacity = interpolate(frame, [85, 110], [0, 1], { extrapolateRight: "clamp" });
  const stat1Spring = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const stat2Spring = spring({ frame: frame - 25, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />

      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "44px 80px", gap: 24, zIndex: 1 }}>
        {/* Header */}
        <div style={{ opacity: headerOpacity }}>
          <div style={{ fontSize: 24, color: colors.info, fontWeight: 600, letterSpacing: 4, marginBottom: 10 }}>MARKET DATA</div>
          <h2 style={{ fontSize: 50, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            한국 하드웨어 R&D에 숨은 <span style={{ color: colors.accent }}>거대한 비효율</span>
          </h2>
        </div>

        {/* Two column layout */}
        <div style={{ display: "flex", gap: 36, flex: 1 }}>
          {/* Col 1: Big numbers */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
            <div style={{ transform: `translateX(${interpolate(stat1Spring, [0, 1], [-30, 0])}px)`, opacity: interpolate(stat1Spring, [0, 1], [0, 1]) }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: colors.primary, lineHeight: 1 }}>131조 원</div>
              <div style={{ fontSize: 30, color: colors.textSecondary, marginTop: 8 }}>한국 총 R&D 투자 (2024)</div>
              <div style={{ fontSize: 26, color: colors.textSecondary, marginTop: 6 }}>GDP 대비 5.21% — 세계 2위</div>
              <div style={{ fontSize: 22, color: colors.textMuted, marginTop: 6, fontStyle: "italic" }}>Source: MSIT / OECD, 2024</div>
            </div>

            <div style={{ transform: `translateX(${interpolate(stat2Spring, [0, 1], [-30, 0])}px)`, opacity: interpolate(stat2Spring, [0, 1], [0, 1]) }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: colors.accent, lineHeight: 1 }}>14%</div>
              <div style={{ fontSize: 30, color: colors.textSecondary, marginTop: 8 }}>First-Silicon 성공률 — 20년 최저</div>
              <div style={{ fontSize: 26, color: colors.textSecondary, marginTop: 6 }}>86%가 Respin 필요 — 1회당 $10M+, 8~12주 지연</div>
              <div style={{ fontSize: 22, color: colors.textMuted, marginTop: 6, fontStyle: "italic" }}>Source: Wilson Research Group / Siemens EDA, 2024</div>
            </div>
          </div>

          {/* Col 2: Bar chart + 1-10-100 Rule */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            {/* Chart title */}
            <div style={{ fontSize: 30, fontWeight: 700, color: colors.text }}>반도체 설계 리소스 배분</div>

            {/* Verification bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, marginBottom: 8 }}>
                <span style={{ color: colors.accent, fontWeight: 700 }}>검증 (Verification)</span>
                <span style={{ color: colors.accent, fontWeight: 800, fontSize: 32 }}>{Math.round(65 * barProgress)}%</span>
              </div>
              <div style={{ width: "100%", height: 48, borderRadius: 24, backgroundColor: `${colors.accent}15`, overflow: "hidden" }}>
                <div style={{ width: `${65 * barProgress}%`, height: "100%", borderRadius: 24, background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}cc)` }} />
              </div>
              <div style={{ fontSize: 22, color: colors.textMuted, marginTop: 6 }}>전체 엔지니어링 리소스의 60~70%가 검증에 소모</div>
            </div>

            {/* Design bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 6 }}>
                <span style={{ color: colors.info, fontWeight: 600 }}>설계 (Design)</span>
                <span style={{ color: colors.info, fontWeight: 700, fontSize: 28 }}>{Math.round(20 * barProgress)}%</span>
              </div>
              <div style={{ width: "100%", height: 38, borderRadius: 19, backgroundColor: `${colors.info}12`, overflow: "hidden" }}>
                <div style={{ width: `${20 * barProgress}%`, height: "100%", borderRadius: 19, background: `linear-gradient(90deg, ${colors.info}, ${colors.info}cc)` }} />
              </div>
            </div>

            {/* Others bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 6 }}>
                <span style={{ color: colors.textMuted, fontWeight: 600 }}>기타 (Mgmt, etc.)</span>
                <span style={{ color: colors.textMuted, fontWeight: 700, fontSize: 28 }}>{Math.round(15 * barProgress)}%</span>
              </div>
              <div style={{ width: "100%", height: 32, borderRadius: 16, backgroundColor: `${colors.textMuted}12`, overflow: "hidden" }}>
                <div style={{ width: `${15 * barProgress}%`, height: "100%", borderRadius: 16, background: `${colors.textMuted}60` }} />
              </div>
            </div>

            <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic" }}>Source: Wilson Research Group / Siemens EDA Study, 2024</div>

            {/* 1-10-100 Rule — bigger */}
            <div style={{ opacity: ruleOpacity, display: "flex", alignItems: "flex-end", gap: 24, marginTop: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 80, height: 56 * ruleOpacity, backgroundColor: colors.primary, borderRadius: "10px 10px 0 0", margin: "0 auto" }} />
                <div style={{ fontSize: 34, fontWeight: 800, color: colors.primary, marginTop: 6 }}>$1</div>
                <div style={{ fontSize: 22, color: colors.textMuted }}>Design</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 80, height: 130 * ruleOpacity, backgroundColor: colors.warning, borderRadius: "10px 10px 0 0", margin: "0 auto" }} />
                <div style={{ fontSize: 34, fontWeight: 800, color: colors.warning, marginTop: 6 }}>$10</div>
                <div style={{ fontSize: 22, color: colors.textMuted }}>Production</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 80, height: 210 * ruleOpacity, backgroundColor: colors.accent, borderRadius: "10px 10px 0 0", margin: "0 auto" }} />
                <div style={{ fontSize: 34, fontWeight: 800, color: colors.accent, marginTop: 6 }}>$100</div>
                <div style={{ fontSize: 22, color: colors.textMuted }}>Field</div>
              </div>
              <div style={{ marginLeft: 16, paddingBottom: 8 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: colors.text }}>1-10-100 Rule</div>
                <div style={{ fontSize: 24, color: colors.textSecondary, lineHeight: 1.4 }}>결함 발견이 늦을수록 비용 기하급수 증가</div>
                <div style={{ fontSize: 22, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>IBM Systems Sciences Institute / NIST</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
