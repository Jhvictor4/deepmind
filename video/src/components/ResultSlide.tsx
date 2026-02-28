import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { colors, fullScreen } from "../styles";

export const ResultSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const causeOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const boundingBoxOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const actionOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const pulseScale = 1 + Math.sin(frame * 0.12) * 0.02 * boundingBoxOpacity;

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />
      <div style={{ display: "flex", width: "100%", height: "100%", padding: "40px 64px", gap: 36, zIndex: 1 }}>
        {/* Left: PCB comparison — more space */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ opacity: headerOpacity }}>
            <div style={{ fontSize: 30, color: colors.accent, fontWeight: 600, letterSpacing: 4 }}>FINAL REPORT</div>
            <h2 style={{ fontSize: 54, fontWeight: 800, margin: "8px 0 0" }}>Root Cause 분석 완료</h2>
          </div>

          <div style={{ display: "flex", gap: 14, flex: 1 }}>
            <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <Img src={staticFile("images/pcb-template.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 12, left: 12, backgroundColor: `${colors.primary}dd`, borderRadius: 8, padding: "8px 18px", fontSize: 30, fontWeight: 700, color: "#fff" }}>TEMPLATE (Clean)</div>
            </div>

            <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <Img src={staticFile("images/pcb-defect-result.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {/* Clean bounding box — reduced glow */}
              <div style={{ position: "absolute", top: "30%", left: "20%", width: "35%", height: "25%", border: `4px solid ${colors.accent}`, borderRadius: 6, opacity: boundingBoxOpacity, boxShadow: `0 0 12px ${colors.accent}60`, transform: `scale(${pulseScale})` }} />
              <div style={{ position: "absolute", top: 12, left: 12, backgroundColor: `${colors.accent}dd`, borderRadius: 8, padding: "8px 18px", fontSize: 30, fontWeight: 700, color: "#fff" }}>TESTED (Defect!)</div>
              {boundingBoxOpacity > 0.5 && (
                <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, backgroundColor: `${colors.bg}ee`, borderRadius: 10, padding: "12px 18px", fontSize: 30, fontWeight: 700, color: colors.accent, fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
                  Defect @ (x:120, y:45) | Type: Micro-Short
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 28, color: colors.textMuted, textAlign: "center" }}>Source: DeepPCB Dataset - PCB Defect Detection Benchmark</div>
        </div>

        {/* Right: Analysis — narrower, bigger text */}
        <div style={{ width: 540, display: "flex", flexDirection: "column", gap: 24, flexShrink: 0, justifyContent: "center" }}>
          <div style={{ opacity: causeOpacity, borderLeft: `5px solid ${colors.accent}`, paddingLeft: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: colors.accent, letterSpacing: 2, marginBottom: 12 }}>ROOT CAUSE TRACE</div>
            <div style={{ fontSize: 32, lineHeight: 1.6, color: colors.textSecondary }}>
              <span style={{ color: colors.accent, fontWeight: 700 }}>Error 0x08</span> {"-> "}SDA-GND Short 후보
              {"-> "}CAD U3-Pin5 / Via-B2 매핑
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.6, color: colors.text, marginTop: 6 }}>
              PCB 확대 검증: <span style={{ color: colors.accent, fontWeight: 700 }}>(120,45) 미세 단락</span> 검출
            </div>
            <div style={{ fontSize: 32, lineHeight: 1.6, color: colors.text, marginTop: 6 }}>
              <span style={{ color: colors.accent, fontWeight: 700 }}>제조(에칭) 공정 불량</span>으로
              SDA-GND 사이 구리 찌꺼기 잔존
            </div>
          </div>

          <div style={{ opacity: causeOpacity, borderLeft: `5px solid ${colors.warning}`, paddingLeft: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: colors.warning, letterSpacing: 2, marginBottom: 12 }}>IMPACT</div>
            <div style={{ fontSize: 34, lineHeight: 1.6, color: colors.text }}>I2C 통신 마비 {"-> "}센서 데이터 수집 불가</div>
            <div style={{ fontSize: 34, lineHeight: 1.6, color: colors.text, marginTop: 6 }}>
              과전류로 <span style={{ color: colors.warning, fontWeight: 700 }}>MCU Burn-out</span> 위험
            </div>
          </div>

          <div style={{ opacity: actionOpacity, borderLeft: `5px solid ${colors.primary}`, paddingLeft: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: colors.primary, letterSpacing: 2, marginBottom: 12 }}>SPEC-BASED RESOLUTION</div>
            <div style={{ fontSize: 32, lineHeight: 1.6, color: colors.textSecondary, marginBottom: 4 }}>
              IPC-2221C Sec 6.1: 최소 이격 0.1mm (설계 0.15mm = PASS)
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.6, color: colors.text }}>
              <span style={{ fontWeight: 700 }}>Immediate</span> — (120,45) 납땜 브릿지 제거
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.6, color: colors.text, marginTop: 6 }}>
              <span style={{ fontWeight: 700 }}>Process</span> — 에칭 공정 세척 수압/화학액 농도 점검
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
