interface Props {
  resolutions: string[];
}

export default function ResolutionList({ resolutions }: Props) {
  return (
    <div style={{ animation: 'fadeUp 0.6s ease' }}>
      <div style={{
        fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)',
      }}>Resolution Steps</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {resolutions.map((r, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '6px 0',
          }}>
            <span style={{
              flexShrink: 0, fontSize: '0.9375rem', fontWeight: 700,
              color: 'var(--text-muted)',
            }}>
              {i + 1}.
            </span>
            <span style={{
              fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              wordBreak: 'keep-all', overflowWrap: 'break-word',
            }}>
              {r}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
