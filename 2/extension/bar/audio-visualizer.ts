/**
 * SafeNav Audio Visualizer
 * Simple waveform visualization rendered on a <canvas>.
 */

export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private bars: number[] = [];
  private barCount = 32;
  private active = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bars = new Array(this.barCount).fill(0);
  }

  start(): void {
    this.active = true;
    this.draw();
  }

  stop(): void {
    this.active = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Fade out bars
    this.bars.fill(0);
    this.render();
  }

  /** Feed audio level data (0–1) to the visualizer */
  pushLevel(level: number): void {
    this.bars.shift();
    this.bars.push(Math.min(1, Math.max(0, level)));
  }

  /** Simulate waveform activity (used when no real audio data) */
  simulateActivity(): void {
    for (let i = 0; i < this.barCount; i++) {
      const target = 0.1 + Math.random() * 0.5;
      this.bars[i] += (target - this.bars[i]) * 0.3;
    }
  }

  private draw = (): void => {
    if (!this.active) return;

    // If no real audio, simulate
    this.simulateActivity();
    this.render();

    this.animationId = requestAnimationFrame(this.draw);
  };

  private render(): void {
    const { canvas, ctx, bars } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const barWidth = w / bars.length;
    const gap = 2;
    const maxHeight = h * 0.8;

    for (let i = 0; i < bars.length; i++) {
      const barH = Math.max(2, bars[i] * maxHeight);
      const x = i * barWidth + gap / 2;
      const y = (h - barH) / 2;

      ctx.fillStyle = 'rgba(66, 133, 244, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth - gap, barH, 1);
      ctx.fill();
    }
  }
}
