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

interface AgentDemoProps {
  agentIndex: number;
}

const agents = [
  {
    num: 1,
    tag: "SYM",
    name: "Symptom Analyzer",
    nameKr: "현상 분석가",
    role: "에러 로그를 분석하여 결함 후보군 추출",
    inputImage: "error-log.png",
    input:
      "[ERROR] I2C Bus Arbitration Lost\nSDA line held LOW\nError Code: 0x08\n(통신 라인 전압 강하 감지)",
    output:
      "DIAGNOSIS:\nI2C SDA 라인이 Low로 고정됨\n\nPROBABLE CAUSE:\nSDA <-> GND 사이 물리적 Short\nConfidence: 95%\n\n> Agent 2에 규격 검증 요청...",
    inputLabel: "INPUT: Error Log",
    outputLabel: "OUTPUT: Fault Candidates",
    color: colors.accent,
    nextHint: "후보군을 Agent 2로 전달",
  },
  {
    num: 2,
    tag: "SPEC",
    name: "Spec Retriever",
    nameKr: "스펙 전문가",
    role: "600+ 페이지 규격 문서에서 관련 조항 자동 발췌",
    inputImage: "pcie-spec.png",
    input:
      "IPC-2221C Section 6.1\n최소 전기적 이격 거리\n(Minimum Electrical Clearance)\n\nDocument: 124 pages\nLanguage: English",
    output:
      "SPEC FOUND:\nIPC-2221C Table 6-1\n\n5V Operating Voltage:\nMin Trace Clearance = 0.1mm\n\nViolation Threshold:\n< 0.1mm = CRITICAL FAIL\n\n> Agent 3에 설계 검증 요청...",
    inputLabel: "INPUT: Spec PDF (124p)",
    outputLabel: "OUTPUT: Regulation Extract",
    color: colors.warning,
    nextHint: "규격 기준을 Agent 3으로 전달",
  },
  {
    num: 3,
    tag: "CAD",
    name: "Design Inspector",
    nameKr: "설계 검증가",
    role: "CAD 이미지를 스캔하여 설계 결함 탐색",
    inputImage: "pcb-layout.jpg",
    input:
      "PCB Design Layout\nSDA <-> GND Trace Routing\n\nChecking against:\nIPC-2221C Min Clearance\n= 0.1mm",
    output:
      "DESIGN CHECK: PASS\n\nMeasured: 0.15mm\nRequired: >= 0.1mm\nStatus: Within Spec\n\nDESIGN IS SAFE.\n> 제조 공정 의심\n> Agent 4 실물 확인 요청",
    inputLabel: "INPUT: CAD Schematic",
    outputLabel: "OUTPUT: Design Verification",
    color: colors.info,
    nextHint: "설계 통과 -> 실물 확인 요청 -> Agent 4",
  },
  {
    num: 4,
    tag: "VIS",
    name: "Physical Vision",
    nameKr: "실물 검사관",
    role: "실물 PCB 사진 비전 분석으로 제조 결함 탐지",
    inputImage: "pcb-defect.jpg",
    input:
      "PCB Test Image\n(DeepPCB Dataset)\nHigh-res Inspection\n\nComparing against\nTemplate for defects",
    output:
      "!! DEFECT DETECTED !!\n\nType: Micro-Short\nLocation: (x:120, y:45)\nSeverity: CRITICAL\n\nCopper residue bridging\nSDA <-> GND traces\n\n> ROOT CAUSE CONFIRMED",
    inputLabel: "INPUT: PCB Photo",
    outputLabel: "OUTPUT: Vision Analysis",
    color: colors.primary,
    nextHint: "Root Cause 확정 -> 최종 리포트 생성",
  },
];

export const AgentDemoSlide: React.FC<AgentDemoProps> = ({ agentIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agent = agents[agentIndex];

  const headerSpring = spring({ frame, fps, config: { damping: 15 } });
  const inputOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const processingWidth = interpolate(frame, [30, 85], [0, 100], {
    extrapolateRight: "clamp",
  });
  const outputOpacity = interpolate(frame, [85, 105], [0, 1], {
    extrapolateRight: "clamp",
  });
  const hintOpacity = interpolate(frame, [125, 145], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

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
          width: "100%",
          height: "100%",
          padding: "36px 64px",
          zIndex: 1,
          gap: 16,
        }}
      >
        {/* Pipeline indicator — minimal */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {agents.map((a, i) => {
            const isActive = i === agentIndex;
            const isDone = i < agentIndex;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 20px",
                  borderRadius: 100,
                  backgroundColor: isActive ? `${a.color}18` : "transparent",
                  border: `1.5px solid ${
                    isActive ? a.color : isDone ? `${colors.primary}50` : colors.divider
                  }`,
                  fontSize: 18,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? a.color : isDone ? colors.primary : colors.textMuted,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>
                  {a.tag}
                </span>
                {isDone && (
                  <span style={{ color: colors.primary, fontWeight: 700 }}>DONE</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Agent header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            transform: `translateX(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: `${agent.color}12`,
              border: `2px solid ${agent.color}30`,
              fontSize: 20,
              fontWeight: 900,
              color: agent.color,
              letterSpacing: 1,
            }}
          >
            {agent.tag}
          </div>
          <div>
            <div style={{ fontSize: 20, color: agent.color, fontWeight: 600, letterSpacing: 2 }}>
              AGENT {agent.num}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>
              {agent.nameKr}{" "}
              <span style={{ fontSize: 22, color: colors.textMuted, fontWeight: 400 }}>
                {agent.name}
              </span>
            </div>
          </div>
        </div>

        {/* Main layout: Image | Input -> Output */}
        <div style={{ display: "flex", gap: 16, flex: 1, alignItems: "stretch" }}>
          {/* Image */}
          <div
            style={{
              width: 320,
              opacity: inputOpacity,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile(`images/${agent.inputImage}`)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: `linear-gradient(transparent, ${colors.bg}ee)`,
                padding: "24px 14px 12px",
                fontSize: 20,
                color: colors.textSecondary,
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {agent.inputLabel}
            </div>
          </div>

          {/* Input text */}
          <div
            style={{
              flex: 1,
              opacity: inputOpacity,
              borderRadius: 16,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              backgroundColor: `${colors.bgAlt}80`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, color: colors.textMuted, letterSpacing: 1 }}>
              RAW INPUT
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', 'Menlo', monospace",
                fontSize: 22,
                lineHeight: 1.8,
                color: colors.textSecondary,
                whiteSpace: "pre-wrap",
                backgroundColor: `${colors.bg}`,
                borderRadius: 12,
                padding: 18,
                flex: 1,
                border: `1px solid ${colors.divider}`,
              }}
            >
              {agent.input}
            </div>
          </div>

          {/* Arrow + progress */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minWidth: 70,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: agent.color, letterSpacing: 1 }}>
              {processingWidth < 100 ? "PROCESSING" : "DONE"}
            </div>
            <div
              style={{
                width: 50,
                height: 4,
                borderRadius: 2,
                backgroundColor: `${agent.color}15`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${processingWidth}%`,
                  height: "100%",
                  backgroundColor: agent.color,
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ fontSize: 36, color: agent.color }}>{"\u2192"}</div>
          </div>

          {/* Output */}
          <div
            style={{
              flex: 1,
              opacity: outputOpacity,
              borderRadius: 16,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              backgroundColor: `${colors.bgAlt}80`,
              border: `1px solid ${agent.color}20`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, color: agent.color, letterSpacing: 1 }}>
              {agent.outputLabel}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', 'Menlo', monospace",
                fontSize: 22,
                lineHeight: 1.8,
                color: colors.textSecondary,
                whiteSpace: "pre-wrap",
                backgroundColor: colors.bg,
                borderRadius: 12,
                padding: 18,
                flex: 1,
                border: `1px solid ${agent.color}15`,
              }}
            >
              {agent.output}
              {frame < 125 && cursorVisible && (
                <span style={{ color: agent.color }}>|</span>
              )}
            </div>
          </div>
        </div>

        {/* Next hint */}
        <div
          style={{
            opacity: hintOpacity,
            textAlign: "center",
            fontSize: 24,
            color: colors.textMuted,
            fontWeight: 500,
          }}
        >
          {agent.nextHint}
        </div>
      </div>
    </AbsoluteFill>
  );
};
