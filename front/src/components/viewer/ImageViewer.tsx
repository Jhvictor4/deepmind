import { useRef, useState, useEffect } from 'react';
import type { BoundingBox } from '../../types/api';
import BoundingBoxOverlay from './BoundingBoxOverlay';

interface Props {
  src: string;
  boxes: BoundingBox[];
  color: string;
  label: string;
  highlightedLabel: string | null;
  onHoverLabel: (label: string | null) => void;
  onClickLabel?: (label: string) => void;
}

export default function ImageViewer({
  src, boxes, color, label,
  highlightedLabel, onHoverLabel, onClickLabel,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0, nw: 512, nh: 512 });

  const updateDims = () => {
    const img = imgRef.current;
    if (!img) return;
    setDims({
      w: img.clientWidth, h: img.clientHeight,
      nw: img.naturalWidth || 512, nh: img.naturalHeight || 512,
    });
  };

  useEffect(() => {
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  if (!src) {
    return (
      <div>
        <div className="label">{label}</div>
        <div style={{
          border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
          padding: 40, textAlign: 'center', minHeight: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-alt)', color: 'var(--text-muted)',
          fontSize: '0.9375rem',
        }}>
          No image uploaded
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="label">{label}</div>
      <div style={{
        position: 'relative', display: 'inline-block',
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <img ref={imgRef} src={src} alt={label} onLoad={updateDims}
          style={{
            width: '100%', maxWidth: 440, display: 'block',
            borderRadius: 'var(--radius-sm)',
          }}
        />
        {dims.w > 0 && boxes.length > 0 && (
          <BoundingBoxOverlay
            boxes={boxes} imgWidth={dims.w} imgHeight={dims.h}
            naturalWidth={dims.nw} naturalHeight={dims.nh}
            color={color} highlightedLabel={highlightedLabel}
            onHoverLabel={onHoverLabel} onClickLabel={onClickLabel}
          />
        )}
      </div>
    </div>
  );
}
