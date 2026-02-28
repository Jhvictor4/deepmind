import { useOrchestrationStore } from '../../stores/orchestrationStore';
import ImageViewer from './ImageViewer';
import type { BoundingBox, DesignOutput } from '../../types/api';

export default function ImageCompare() {
  const {
    result, highlightedBoxLabel, setHighlightedBoxLabel, setHighlightedSpecIdx,
    designImageB64, testedImageB64,
  } = useOrchestrationStore();

  if (!result) return null;

  // If no images uploaded, skip this section entirely
  const designSrc = designImageB64 ? `data:image/png;base64,${designImageB64}` : '';
  const testedSrc = testedImageB64 ? `data:image/png;base64,${testedImageB64}` : '';

  if (!designSrc && !testedSrc) return null;

  // CAD Mapper (agent_2b) provides design findings
  const designTrace = result.agent_trace.find((t) => t.agent_id === 'agent_2b');
  const designOutput = designTrace?.output as unknown as DesignOutput | undefined;
  const designBoxes: BoundingBox[] = (designOutput?.cad_mappings ?? []).map((f) => ({
    label: f.part_name, x1: f.bbox.x1, y1: f.bbox.y1, x2: f.bbox.x2, y2: f.bbox.y2,
    confidence: 0.7,
  }));

  const physicalBoxes = result.output.bounding_boxes;

  return (
    <section className="card" style={{ padding: 'var(--space-lg)', animation: 'fadeUp 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)' }}>
        <span style={{
          fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--accent)',
        }}>
          IMAGE ANALYSIS
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Hover bounding boxes to cross-reference with spec rules
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {designSrc && (
          <ImageViewer
            src={designSrc}
            boxes={designBoxes} color="var(--bbox-design)"
            label="Design (Template)"
            highlightedLabel={highlightedBoxLabel}
            onHoverLabel={setHighlightedBoxLabel}
          />
        )}
        {testedSrc && (
          <ImageViewer
            src={testedSrc}
            boxes={physicalBoxes} color="var(--bbox-physical)"
            label="Tested Board"
            highlightedLabel={highlightedBoxLabel}
            onHoverLabel={setHighlightedBoxLabel}
            onClickLabel={(label) => {
              const idx = physicalBoxes.findIndex((b) => b.label === label);
              setHighlightedSpecIdx(idx >= 0 ? idx : null);
            }}
          />
        )}
      </div>
    </section>
  );
}
