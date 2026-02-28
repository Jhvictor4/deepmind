import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { colors, fullScreen } from "../styles";

const agents = [
  { step: 1, tag: "SYM", name: "Symptom Analyzer", input: "Error Log (0x08)", output: "SDA-GND Short / Pull-up 불량", color: colors.accent, pos: "top" as const },
  { step: 2, tag: "CAD", name: "Design Inspector", input: "CAD Schematic", output: "SDA: U3-Pin5 / GND: Via-B2", color: colors.info, pos: "left" as const },
  { step: 3, tag: "VIS", name: "Physical Vision", input: "PCB Photo (B2 확대)", output: "Micro-Short @ (120,45)", color: colors.primary, pos: "right" as const },
  { step: 4, tag: "SPEC", name: "Spec Retriever", input: "IPC-2221C Spec", output: "이격 0.1mm 기준 + 해결방안", color: colors.warning, pos: "bottom" as const },
];

export const AgentArchSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Center orchestrator
  const centerOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const centerScale = spring({ frame: frame - 10, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={fullScreen}>
      {/* Clean background */}
      <div style={{ position: "absolute", width: "100%", height: "100%", background: colors.bg }} />

      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "36px 60px", gap: 12, zIndex: 1 }}>
        {/* Header */}
        <div style={{ opacity: headerOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 30, color: colors.primary, fontWeight: 600, letterSpacing: 4, marginBottom: 8 }}>AGENTIC ARCHITECTURE</div>
          <h2 style={{ fontSize: 54, fontWeight: 800, margin: 0 }}>
            4개 Agent가 <span style={{ color: colors.primary }}>Orchestration</span>되어 협업
          </h2>
        </div>

        {/* Architecture diagram */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Center: Orchestrator — bigger */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${interpolate(centerScale, [0, 1], [0.5, 1])})`,
              opacity: centerOpacity,
              width: 320,
              height: 180,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${colors.primary}20, ${colors.info}20)`,
              border: `2px solid ${colors.primary}60`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 600, color: colors.primary, letterSpacing: 2 }}>ORCHESTRATOR</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: colors.text }}>Gemini Pro</div>
            <div style={{ fontSize: 28, color: colors.textSecondary }}>Multimodal Reasoning</div>
          </div>

          {/* Agent nodes + arrows */}
          {agents.map((agent, i) => {
            const delay = 25 + i * 15;
            const nodeOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const arrowProgress = interpolate(frame, [delay + 15, delay + 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            // Position each agent around the center
            let nodeStyle: React.CSSProperties = {};
            let arrowStyle: React.CSSProperties = {};

            if (agent.pos === "top") {
              nodeStyle = { position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" };
              arrowStyle = {
                position: "absolute", top: 150, left: "50%", transform: "translateX(-50%)",
                width: 5, height: 110 * arrowProgress, background: `linear-gradient(180deg, ${agent.color}, ${agent.color}40)`, borderRadius: 3,
              };
            } else if (agent.pos === "left") {
              nodeStyle = { position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)" };
              arrowStyle = {
                position: "absolute", top: "50%", left: 420, transform: "translateY(-50%)",
                height: 5, width: 180 * arrowProgress, background: `linear-gradient(90deg, ${agent.color}, ${agent.color}40)`, borderRadius: 3,
              };
            } else if (agent.pos === "right") {
              nodeStyle = { position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)" };
              arrowStyle = {
                position: "absolute", top: "50%", right: 420, transform: "translateY(-50%)",
                height: 5, width: 180 * arrowProgress, background: `linear-gradient(270deg, ${agent.color}, ${agent.color}40)`, borderRadius: 3,
              };
            } else {
              nodeStyle = { position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" };
              arrowStyle = {
                position: "absolute", bottom: 150, left: "50%", transform: "translateX(-50%)",
                width: 5, height: 110 * arrowProgress, background: `linear-gradient(0deg, ${agent.color}, ${agent.color}40)`, borderRadius: 3,
              };
            }

            return (
              <React.Fragment key={i}>
                {/* Arrow — thicker */}
                <div style={{ ...arrowStyle, opacity: arrowProgress }} />

                {/* Agent node — wider, stacked layout to prevent wrapping */}
                <div style={{ ...nodeStyle, opacity: nodeOpacity, width: 420 }}>
                  <div style={{
                    borderRadius: 16,
                    border: `2px solid ${agent.color}60`,
                    backgroundColor: `${colors.bgAlt}ee`,
                    padding: "18px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    {/* Row 1: badges + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", backgroundColor: agent.color, padding: "3px 10px", borderRadius: 6, flexShrink: 0 }}>{agent.step}</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: agent.color, letterSpacing: 1, backgroundColor: `${agent.color}15`, padding: "4px 10px", borderRadius: 6, flexShrink: 0 }}>{agent.tag}</div>
                      <div style={{ fontSize: 30, fontWeight: 700, color: colors.text, whiteSpace: "nowrap" }}>{agent.name}</div>
                    </div>
                    {/* Row 2: IN */}
                    <div style={{ fontSize: 26, color: colors.textSecondary }}>
                      <span style={{ color: colors.textMuted, fontWeight: 600 }}>IN: </span>
                      <span style={{ fontWeight: 600 }}>{agent.input}</span>
                    </div>
                    {/* Row 3: OUT */}
                    <div style={{ fontSize: 26, color: agent.color }}>
                      <span style={{ color: colors.textMuted, fontWeight: 600 }}>OUT: </span>
                      <span style={{ fontWeight: 700 }}>{agent.output}</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Final output badge — bigger */}
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: 30,
              opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
              backgroundColor: `${colors.accent}15`,
              border: `2px solid ${colors.accent}60`,
              borderRadius: 14,
              padding: "16px 28px",
            }}
          >
            <div style={{ fontSize: 28, color: colors.accent, fontWeight: 600, letterSpacing: 1 }}>FINAL OUTPUT</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colors.text, marginTop: 4 }}>Defect 위치 + Root Cause + Spec 기반 해결방안</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
