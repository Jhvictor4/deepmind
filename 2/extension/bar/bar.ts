/**
 * SafeNav Bottom Bar UI
 * State machine: idle → connecting → active → acting → error
 * Injected inside Shadow DOM by content-script.ts
 */

import type { BarState, Message } from '../types';
import { AudioVisualizer } from './audio-visualizer';
import barCss from './bar.css?raw';

export class SafeNavBar {
  private state: BarState = 'idle';
  private shadow: ShadowRoot;
  private barEl!: HTMLDivElement;
  private micBtn!: HTMLButtonElement;
  private statusText!: HTMLSpanElement;
  private visualizerContainer!: HTMLDivElement;
  private transcriptEl!: HTMLDivElement;
  private bottomRow!: HTMLDivElement;
  private errorText!: HTMLDivElement;
  private visualizer!: AudioVisualizer;

  private onToggleSession: (() => void) | null = null;

  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.render();
  }

  /** Register callback for mic button toggle */
  onToggle(cb: () => void): void {
    this.onToggleSession = cb;
  }

  setState(newState: BarState, detail?: string): void {
    this.state = newState;
    this.updateUI(detail);
  }

  addTranscript(speaker: 'user' | 'agent', text: string): void {
    const line = document.createElement('div');
    line.className = 'sn-transcript-line';

    const speakerEl = document.createElement('span');
    speakerEl.className = `sn-transcript-speaker ${speaker}`;
    speakerEl.textContent = speaker === 'agent' ? '🤖' : '🧑';

    const textEl = document.createElement('span');
    textEl.className = 'sn-transcript-text';
    textEl.textContent = text;

    line.appendChild(speakerEl);
    line.appendChild(textEl);
    this.transcriptEl.appendChild(line);
    this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
  }

  setTaskProgress(current: number, total: number, description: string): void {
    const progress = this.shadow.querySelector('.sn-task-progress');
    if (progress) {
      progress.textContent = `▶ ${description} (${current}/${total})`;
    }
  }

  // ── Render ──

  private render(): void {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = barCss;
    this.shadow.appendChild(style);

    // Bar container
    this.barEl = document.createElement('div');
    this.barEl.className = 'sn-bar';

    // Top row
    const topRow = document.createElement('div');
    topRow.className = 'sn-top-row';

    // Logo
    const logo = document.createElement('div');
    logo.className = 'sn-logo';
    logo.innerHTML = `
      <div class="sn-logo-icon"></div>
      <span class="sn-logo-text">SafeNav</span>
    `;

    // Visualizer
    this.visualizerContainer = document.createElement('div');
    this.visualizerContainer.className = 'sn-visualizer-container';
    const canvas = document.createElement('canvas');
    this.visualizerContainer.appendChild(canvas);
    this.visualizer = new AudioVisualizer(canvas);

    // Status text
    this.statusText = document.createElement('span');
    this.statusText.className = 'sn-status-text';

    // Mic button
    this.micBtn = document.createElement('button');
    this.micBtn.className = 'sn-mic-btn';
    this.micBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    `;
    this.micBtn.addEventListener('click', () => this.onToggleSession?.());

    topRow.appendChild(logo);
    topRow.appendChild(this.visualizerContainer);
    topRow.appendChild(this.statusText);
    topRow.appendChild(this.micBtn);

    // Transcript area
    this.transcriptEl = document.createElement('div');
    this.transcriptEl.className = 'sn-transcript';

    // Bottom row (disconnect + progress)
    this.bottomRow = document.createElement('div');
    this.bottomRow.className = 'sn-bottom-row';

    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'sn-disconnect-btn';
    disconnectBtn.textContent = '연결 해제';
    disconnectBtn.addEventListener('click', () => this.onToggleSession?.());

    const taskProgress = document.createElement('span');
    taskProgress.className = 'sn-task-progress';

    this.bottomRow.appendChild(disconnectBtn);
    this.bottomRow.appendChild(taskProgress);

    // Error text
    this.errorText = document.createElement('div');
    this.errorText.className = 'sn-error-text';

    // Assemble
    this.barEl.appendChild(topRow);
    this.barEl.appendChild(this.transcriptEl);
    this.barEl.appendChild(this.bottomRow);
    this.barEl.appendChild(this.errorText);

    this.shadow.appendChild(this.barEl);
    this.updateUI();
  }

  private updateUI(detail?: string): void {
    // Reset classes
    this.barEl.className = `sn-bar ${this.state}`;

    // Visibility
    this.transcriptEl.style.display =
      this.state === 'active' || this.state === 'acting' ? 'flex' : 'none';
    this.bottomRow.style.display =
      this.state === 'active' || this.state === 'acting' ? 'flex' : 'none';
    this.errorText.style.display = this.state === 'error' ? 'block' : 'none';

    // Mic button state
    this.micBtn.classList.toggle(
      'active',
      this.state === 'active' || this.state === 'acting',
    );

    // Status text
    switch (this.state) {
      case 'idle':
        this.statusText.textContent = '';
        this.statusText.className = 'sn-status-text';
        this.visualizer.stop();
        break;
      case 'connecting':
        this.statusText.textContent = '연결 중...';
        this.statusText.className = 'sn-status-text sn-connecting-text';
        break;
      case 'active':
        this.statusText.textContent = '🔴 연결됨';
        this.statusText.className = 'sn-status-text connected';
        this.visualizer.start();
        break;
      case 'acting':
        this.statusText.textContent = '🔴 작업 중';
        this.statusText.className = 'sn-status-text connected';
        break;
      case 'error':
        this.statusText.textContent = '';
        this.statusText.className = 'sn-status-text';
        this.errorText.textContent = detail ?? 'An error occurred';
        this.visualizer.stop();
        break;
    }
  }
}
