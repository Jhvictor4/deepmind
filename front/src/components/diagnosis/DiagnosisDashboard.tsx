import { useOrchestrationStore } from '../../stores/orchestrationStore';
import ConfidenceGauge from './ConfidenceGauge';
import RootCauseCard from './RootCauseCard';
import ResolutionList from './ResolutionList';

export default function DiagnosisDashboard() {
  const { result } = useOrchestrationStore();
  if (!result) return null;

  const { output } = result;
  const durationMs = new Date(result.ended_at).getTime() - new Date(result.started_at).getTime();
  const durationStr = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span style={{
          fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--success)',
        }}>
          DIAGNOSIS
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
        <ConfidenceGauge confidence={output.confidence} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <RootCauseCard rootCause={output.root_cause} impact={output.impact} />
          <ResolutionList resolutions={output.resolution} />
        </div>
      </div>

      {/* Run metadata */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '10px 0', borderTop: '1px solid var(--border)',
      }}>
        {[
          { label: 'Model', value: result.model_used },
          { label: 'Duration', value: durationStr },
          { label: 'Agents', value: `${result.agent_trace.length} executed` },
          { label: 'Defects', value: `${output.bounding_boxes.length} found` },
        ].map((m) => (
          <div key={m.label} style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>{m.label}: </span>
            <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
