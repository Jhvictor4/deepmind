import type { OrchestrationResponse } from '../types/api';

export function buildDemoResponse(): OrchestrationResponse {
  const now = new Date();
  const started = new Date(now.getTime() - 8400);

  return {
    run_id: 'demo-' + Math.random().toString(36).slice(2, 10),
    model_used: 'gemini-3.1-pro-preview',
    started_at: started.toISOString(),
    ended_at: now.toISOString(),
    input: {
      error_log: '[ERROR] I2C Bus Arbitration Lost - SDA line held LOW. Error Code: 0x08',
      spec_excerpt:
        'IPC-2221B Section 6.1: 5V 인접 도체 최소 이격 0.10mm 이상. 미세 브릿지/잔류 구리 여부 점검 필요.',
      design_image: { mime_type: 'image/png', source: 'data/assets/template_board.png' },
      tested_image: { mime_type: 'image/png', source: 'data/assets/tested_board.png' },
      heuristic_diff_bbox: { label: 'diff_hotspot', x1: 210, y1: 175, x2: 300, y2: 305, confidence: 0.65 },
    },
    output: {
      root_cause:
        '설계상 이격은 규격 범위였으나 제조 공정 잔류 구리로 SDA-GND 사이 미세 단락이 발생해 I2C 오류를 유발함.',
      impact: '통신 불안정, 센서 데이터 유실, 과전류 리스크 증가.',
      resolution: [
        '결함 영역 브릿지 제거 후 연속성 재검사',
        '제조 세척/에칭 공정 파라미터 재점검',
        'AOI 검사 규칙 강화',
      ],
      confidence: 0.91,
      bounding_boxes: [
        { label: 'micro_short_SDA_GND', x1: 220, y1: 185, x2: 292, y2: 295, confidence: 0.95 },
      ],
    },
    agent_trace: [
      {
        agent_id: 'agent_1',
        agent_name: 'Error Analyzer',
        handoff_to: 'agent_2a,agent_2b',
        handoff_message: '에러 기준으로 spec 체크와 CAD 매핑을 병렬 진행',
        output: {
          error_interpretation:
            'SDA가 LOW로 고정되어 인접 네트 단락 가능성이 높으며, 제조 결함으로 인한 브릿지 의심.',
          suspect_parts: [
            {
              part_name: 'SDA/GND trace pair',
              likely_fault_mode: 'micro short',
              why_related: 'error code 0x08과 bus arbitration lost 패턴 일치',
              confidence: 0.95,
            },
          ],
          handoff_message: 'spec/cad 병렬 검증 요청',
        },
      },
      {
        agent_id: 'agent_2a',
        agent_name: 'Spec Checker',
        handoff_to: 'agent_3',
        handoff_message: 'SPACING-SHORT-001과 SPURIOUS-COPPER-005 기준으로 실물 검증 요청',
        output: {
          spec_watchlist: [
            {
              rule_id: 'SPACING-SHORT-001',
              what_to_check: '인접 도체 간 이격 및 브릿지 존재 여부',
              why_relevant: 'short 오류 직접 연관',
              priority: 'high',
            },
          ],
          spec_risk_summary: '규격상 이격 충족 여부와 별도로 제조 잔류물 단락 위험이 큼.',
          handoff_message: '물리 검증으로 이행',
        },
      },
      {
        agent_id: 'agent_2b',
        agent_name: 'CAD Mapper',
        handoff_to: 'agent_3',
        handoff_message: '의심 영역 bbox 전달',
        output: {
          cad_mappings: [
            {
              part_name: 'SDA segment near R12',
              schematic_reference: 'U3.SDA / R12 vicinity',
              reason: '오류 네트와 가장 근접한 고밀도 구간',
              bbox: { x1: 215, y1: 180, x2: 298, y2: 300 },
            },
          ],
          handoff_message: '실물 이미지 확대 검증',
        },
      },
      {
        agent_id: 'agent_3',
        agent_name: 'Defect Inspector',
        handoff_to: 'agent_4',
        handoff_message: '결함 검증 완료, spec 기반 최종 조치 산출 요청',
        output: {
          defect_verification: [
            {
              part_name: 'SDA/GND trace pair',
              defect_type: 'spurious copper bridge',
              evidence: '두 트레이스 사이 잔류 구리로 연결 흔적 확인',
              crop_note: '확대 ROI 검증',
              confidence: 0.95,
              bbox: { x1: 220, y1: 185, x2: 292, y2: 295 },
            },
          ],
          root_cause_candidate: '제조 공정 잔류 구리에 의한 미세 단락',
          impact: 'I2C 통신 실패 및 과전류 리스크',
          handoff_message: '최종 spec resolver로 전달',
        },
      },
      {
        agent_id: 'agent_4',
        agent_name: 'Spec Resolution',
        handoff_to: null,
        handoff_message: null,
        output: {
          spec_checks: [
            {
              rule_id: 'SPACING-SHORT-001',
              rule_text: '인접 네트 간 단락 경로가 없어야 함',
              compliance_status: 'fail',
              gap: '잔류 구리 브릿지로 규칙 위반',
            },
          ],
          final_root_cause: '제조 공정 잔류 구리로 인한 SDA-GND 미세 단락',
          final_resolution: [
            '브릿지 제거 및 세정',
            '재검사(연속성/절연)',
            '제조 파라미터 피드백',
          ],
          final_confidence: 0.91,
        },
      },
    ],
  };
}

export const DEMO_INPUT = {
  errorLog:
    '[ERROR] I2C Bus Arbitration Lost - SDA line held LOW. Error Code: 0x08\n(통신 라인 전압 강하 감지)',
  specExcerpt:
    'IPC-2221C Section 6.1\n최소 전기적 이격 거리 (Minimum Electrical Clearance)\n5V 이하 동작 전압에서 외부 도체 간 최소 이격 거리는 0.10mm 이상.',
};
