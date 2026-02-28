interface Props {
  rootCause: string;
  impact: string;
}

export default function RootCauseCard({ rootCause, impact }: Props) {
  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <div style={{
        fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)',
      }}>Root Cause</div>
      <div style={{
        fontSize: '0.9375rem', marginBottom: 'var(--space-md)', lineHeight: 1.7,
        color: 'var(--text)', fontWeight: 600,
        wordBreak: 'keep-all', overflowWrap: 'break-word',
      }}>
        {rootCause}
      </div>

      <div style={{
        fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)',
      }}>Impact</div>
      <div style={{
        fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7,
        wordBreak: 'keep-all', overflowWrap: 'break-word',
      }}>
        {impact}
      </div>
    </div>
  );
}
