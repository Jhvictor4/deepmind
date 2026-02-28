import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  staticFile,
} from "remotion";
import { colors, fullScreen } from "../styles";

const problems = [
  { label: "Error Log", desc: "정체불명의 에러 코드만 출력", image: "error-log.png" },
  { label: "CAD Schematic", desc: "수백 장의 회로 설계도 수동 확인", image: "pcb-layout.jpg" },
  { label: "PCB Inspection", desc: "미세 결함을 육안으로 검사", image: "pcb-defect.jpg" },
  { label: "Spec PDF", desc: "600+ 페이지 영문 규격서", image: "pcie-spec.png" },
];

export const ProblemSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, zIndex: 1, padding: "48px 72px", width: "100%" }}>
        <div style={{ opacity: headerOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 30, color: colors.accent, fontWeight: 600, letterSpacing: 4, marginBottom: 14 }}>THE PROBLEM</div>
          <h2 style={{ fontSize: 62, fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
            <span style={{ color: colors.text }}>하드웨어 검증 엔지니어</span>는
            <br /><span style={{ color: colors.accent }}>4가지 이질적 데이터</span>를 수작업으로 대조합니다
          </h2>
        </div>

        {/* Cards — accent color only, bigger images */}
        <div style={{ display: "flex", gap: 24, width: "100%", justifyContent: "center" }}>
          {problems.map((p, i) => {
            const delay = 20 + i * 10;
            const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            const o = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ opacity: o, transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`, flex: 1, maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ width: "100%", height: 310, borderRadius: 16, overflow: "hidden", position: "relative" }}>
                  <Img src={staticFile(`images/${p.image}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 40%, ${colors.bg}cc 100%)` }} />
                  {/* Accent color bar only — single color for "problem" */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: colors.accent }} />
                </div>
                <div style={{ padding: "0 4px" }}>
                  <div style={{ fontSize: 38, fontWeight: 700, color: colors.accent, marginBottom: 6 }}>{p.label}</div>
                  <div style={{ fontSize: 30, color: colors.textSecondary, lineHeight: 1.4 }}>{p.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" }), fontSize: 34, color: colors.textSecondary, textAlign: "center", lineHeight: 1.5 }}>
          이 4가지가 완전히 <span style={{ color: colors.accent, fontWeight: 700 }}>파편화</span>되어
          종합하는 데 <span style={{ color: colors.accent, fontWeight: 700 }}>약 6개월</span> 소요
          <span style={{ fontSize: 28, color: colors.textMuted }}> (최신 DRAM 검증 기준)</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
