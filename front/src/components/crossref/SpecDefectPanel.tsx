import { useOrchestrationStore } from '../../stores/orchestrationStore';
import SpecRuleCard from './SpecRuleCard';
import type { SpecOutput } from '../../types/api';

export default function SpecDefectPanel() {
  const { result, highlightedSpecIdx, setHighlightedSpecIdx, setHighlightedBoxLabel } =
    useOrchestrationStore();

  if (!result) return null;

  const specTrace = result.agent_trace.find((t) => t.agent_id === 'agent_2a');
  const specOutput = specTrace?.output as unknown as SpecOutput | undefined;
  const findings = specOutput?.spec_watchlist ?? [];
  const bboxes = result.output.bounding_boxes;

  const handleHover = (idx: number | null) => {
    setHighlightedSpecIdx(idx);
    if (idx !== null && bboxes[idx]) {
      setHighlightedBoxLabel(bboxes[idx].label);
    } else {
      setHighlightedBoxLabel(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <span style={{
          fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--warning)',
        }}>
          SPEC / DEFECT CROSS-REFERENCE
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {findings.length > 0 ? (
          findings.map((f, i) => (
            <SpecRuleCard key={i} finding={f} index={i}
              isHighlighted={highlightedSpecIdx === i} onHover={handleHover}
            />
          ))
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No spec findings available
          </div>
        )}
      </div>
    </div>
  );
}
