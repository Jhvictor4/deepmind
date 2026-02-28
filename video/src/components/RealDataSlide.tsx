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

const documents = [
  { image: "pcie-spec.png", title: "PCIe Base Spec Rev 5.0", pages: "1,024 pages", org: "PCI-SIG", color: colors.warning, boxPos: { top: "25%", left: "8%", width: "84%", height: "28%" } },
  { image: "ipc-standard.png", title: "IPC-2221C Standard", pages: "124 pages", org: "IPC Association", color: colors.warning, boxPos: { top: "35%", left: "5%", width: "90%", height: "22%" } },
  { image: "signal-waveform-3.jpg", title: "Signal Eye Diagram", pages: "Real-time Scope", org: "High-Speed Signal Analysis", color: colors.warning, boxPos: { top: "20%", left: "15%", width: "65%", height: "45%" } },
];

export const RealDataSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "44px 72px", gap: 24, zIndex: 1 }}>
        <div style={{ opacity: headerOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 24, color: colors.warning, fontWeight: 600, letterSpacing: 4, marginBottom: 10 }}>REAL DOCUMENTS</div>
          <h2 style={{ fontSize: 50, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            하드웨어 검증 엔지니어가 매일 씨름하는 <span style={{ color: colors.warning }}>실제 문서들</span>
          </h2>
        </div>

        <div style={{ display: "flex", gap: 28, flex: 1, justifyContent: "center" }}>
          {documents.map((doc, i) => {
            const delay = 15 + i * 18;
            const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            const o = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const boxO = interpolate(frame, [delay + 30, delay + 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ opacity: o, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`, flex: 1, maxWidth: 540, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative", flex: 1, borderRadius: 16, overflow: "hidden" }}>
                  <Img src={staticFile(`images/${doc.image}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {/* Clean bounding box — no glow */}
                  <div style={{ position: "absolute", top: doc.boxPos.top, left: doc.boxPos.left, width: doc.boxPos.width, height: doc.boxPos.height, border: `3px solid ${colors.accent}`, borderRadius: 6, opacity: boxO }} />
                  {boxO > 0.5 && <div style={{ position: "absolute", top: 14, right: 14, backgroundColor: `${colors.accent}ee`, borderRadius: 8, padding: "8px 18px", fontSize: 22, fontWeight: 700, color: "#fff" }}>KEY SECTION</div>}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: `linear-gradient(transparent, ${colors.bg}cc)` }} />
                </div>

                {/* Document info — bigger text */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: colors.warning }}>{doc.title}</div>
                    <div style={{ fontSize: 24, color: colors.textSecondary, marginTop: 4 }}>{doc.org}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: colors.warning }}>{doc.pages}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }), textAlign: "center", fontSize: 28, color: colors.textSecondary }}>
          <span style={{ fontWeight: 700, color: colors.text }}>한 명의 엔지니어</span>가 이 모든 문서를 수작업 교차 검증 = <span style={{ fontWeight: 700, color: colors.accent }}>약 6개월 소요</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
