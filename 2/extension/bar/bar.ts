/**
 * SafeNav Floating FAB + Chat Panel UI
 * State machine: idle → connecting → active → acting → error
 * Injected inside Shadow DOM by content-script.ts
 */

import type { BarState, Message } from '../types';
import { AudioVisualizer } from './audio-visualizer';
import barCss from './bar.css?raw';

const MIC_SVG = `<svg viewBox="0 0 24 24">
  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
</svg>`;

const CLOSE_SVG = `<svg viewBox="0 0 24 24">
  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
</svg>`;

export class SafeNavBar {
  private state: BarState = 'idle';
  private shadow: ShadowRoot;
  private panelOpen = false;
  private unreadCount = 0;

  // DOM refs
  private widgetEl!: HTMLDivElement;
  private panelEl!: HTMLDivElement;
  private fabEl!: HTMLButtonElement;
  private messagesEl!: HTMLDivElement;
  private headerStatus!: HTMLSpanElement;
  private visualizerContainer!: HTMLDivElement;
  private errorText!: HTMLDivElement;
  private badgeEl!: HTMLSpanElement;
  private micBtnPanel!: HTMLButtonElement;
  private textInput!: HTMLInputElement;
  private visualizer!: AudioVisualizer;

  private onToggleSession: (() => void) | null = null;
  private onSendText: ((text: string) => void) | null = null;
  private streamingBubble: { speaker: 'user' | 'agent'; el: HTMLDivElement } | null = null;

  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.render();
  }

  /** Register callback for mic button / session toggle */
  onToggle(cb: () => void): void {
    this.onToggleSession = cb;
  }

  /** Register callback for text input submission */
  onText(cb: (text: string) => void): void {
    this.onSendText = cb;
  }

  setState(newState: BarState, detail?: string): void {
    this.state = newState;
    this.updateUI(detail);
  }

  addTranscript(speaker: 'user' | 'agent', text: string, delta = false): void {
    // Delta: append to the current streaming bubble if same speaker
    if (delta && this.streamingBubble?.speaker === speaker) {
      this.streamingBubble.el.textContent += text;
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      return;
    }

    // New bubble
    const msg = document.createElement('div');
    msg.className = `sn-message ${speaker}`;

    const avatar = document.createElement('span');
    avatar.className = 'sn-message-avatar';
    avatar.textContent = speaker === 'agent' ? '🤖' : '🧑';

    const bubble = document.createElement('div');
    bubble.className = 'sn-bubble';
    bubble.textContent = text;

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    this.messagesEl.appendChild(msg);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    // Track for subsequent deltas
    this.streamingBubble = { speaker, el: bubble };

    // Update unread badge if panel is closed
    if (!this.panelOpen) {
      this.unreadCount++;
      this.badgeEl.textContent = String(this.unreadCount);
      this.widgetEl.classList.add('has-unread');
    }
  }

  setTaskProgress(current: number, total: number, description: string): void {
    const progress = this.shadow.querySelector('.sn-task-progress');
    if (progress) {
      progress.textContent = `▶ ${description} (${current}/${total})`;
    }
  }

  // ── Toggle Panel ──

  private togglePanel(): void {
    this.panelOpen = !this.panelOpen;

    if (this.panelOpen) {
      this.widgetEl.classList.add('panel-open');
      // Clear unread
      this.unreadCount = 0;
      this.widgetEl.classList.remove('has-unread');
      // Scroll to bottom
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    } else {
      this.widgetEl.classList.remove('panel-open');
    }
  }

  private openPanel(): void {
    if (!this.panelOpen) {
      this.togglePanel();
    }
  }

  // ── Render ──

  private render(): void {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = barCss;
    this.shadow.appendChild(style);

    // Widget container
    this.widgetEl = document.createElement('div');
    this.widgetEl.className = 'sn-widget state-idle';

    // ── Panel ──
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'sn-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'sn-panel-header';

    const logo = document.createElement('div');
    logo.className = 'sn-logo';
    logo.innerHTML = `<div class="sn-logo-icon"></div><span class="sn-logo-text">SafeNav</span>`;

    this.headerStatus = document.createElement('span');
    this.headerStatus.className = 'sn-header-status';

    this.visualizerContainer = document.createElement('div');
    this.visualizerContainer.className = 'sn-visualizer-container';
    const canvas = document.createElement('canvas');
    this.visualizerContainer.appendChild(canvas);
    this.visualizer = new AudioVisualizer(canvas);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sn-close-btn';
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', () => this.togglePanel());

    header.appendChild(logo);
    header.appendChild(this.headerStatus);
    header.appendChild(this.visualizerContainer);
    header.appendChild(closeBtn);

    // Messages
    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'sn-messages';

    // Footer
    const footer = document.createElement('div');
    footer.className = 'sn-panel-footer';

    this.errorText = document.createElement('div');
    this.errorText.className = 'sn-error-text';

    const taskProgress = document.createElement('span');
    taskProgress.className = 'sn-task-progress';

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'sn-input-row';

    this.textInput = document.createElement('input');
    this.textInput.className = 'sn-text-input';
    this.textInput.type = 'text';
    this.textInput.placeholder = '메시지 입력...';
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.textInput.value.trim()) {
        const text = this.textInput.value.trim();
        this.textInput.value = '';
        this.onSendText?.(text);
      }
    });

    this.micBtnPanel = document.createElement('button');
    this.micBtnPanel.className = 'sn-mic-btn-panel';
    this.micBtnPanel.innerHTML = MIC_SVG;
    this.micBtnPanel.addEventListener('click', () => this.onToggleSession?.());

    inputRow.appendChild(this.textInput);
    inputRow.appendChild(this.micBtnPanel);

    // Disconnect button
    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'sn-disconnect-btn';
    disconnectBtn.textContent = '연결 해제';
    disconnectBtn.addEventListener('click', () => this.onToggleSession?.());

    footer.appendChild(this.errorText);
    footer.appendChild(taskProgress);
    footer.appendChild(inputRow);
    footer.appendChild(disconnectBtn);

    // Assemble panel
    this.panelEl.appendChild(header);
    this.panelEl.appendChild(this.messagesEl);
    this.panelEl.appendChild(footer);

    // ── FAB ──
    this.fabEl = document.createElement('button');
    this.fabEl.className = 'sn-fab';

    // Gemini icon (default)
    const fabGemini = document.createElement('span');
    fabGemini.className = 'sn-fab-icon-gemini';
    const geminiImg = document.createElement('img');
    geminiImg.src = chrome.runtime.getURL('assets/icon-48.png');
    geminiImg.alt = 'SafeNav';
    fabGemini.appendChild(geminiImg);

    // Close icon (shown when panel open)
    const fabClose = document.createElement('span');
    fabClose.className = 'sn-fab-icon-close';
    fabClose.innerHTML = CLOSE_SVG;

    // Pulse ring
    const pulseRing = document.createElement('span');
    pulseRing.className = 'sn-fab-pulse';

    // Badge
    this.badgeEl = document.createElement('span');
    this.badgeEl.className = 'sn-fab-badge';
    this.badgeEl.textContent = '0';

    this.fabEl.appendChild(fabGemini);
    this.fabEl.appendChild(fabClose);
    this.fabEl.appendChild(pulseRing);
    this.fabEl.appendChild(this.badgeEl);

    this.fabEl.addEventListener('click', () => this.togglePanel());

    // Assemble widget: panel above FAB
    this.widgetEl.appendChild(this.panelEl);
    this.widgetEl.appendChild(this.fabEl);

    this.shadow.appendChild(this.widgetEl);
    this.updateUI();
  }

  private updateUI(detail?: string): void {
    const sessionActive =
      this.state === 'active' || this.state === 'acting' || this.state === 'connecting';

    // Build class list
    const classes = ['sn-widget', `state-${this.state}`];
    if (this.panelOpen) classes.push('panel-open');
    if (sessionActive) classes.push('session-active');
    if (this.unreadCount > 0 && !this.panelOpen) classes.push('has-unread');
    this.widgetEl.className = classes.join(' ');

    // Header status text
    switch (this.state) {
      case 'idle':
        this.headerStatus.textContent = '';
        this.headerStatus.className = 'sn-header-status';
        this.visualizer.stop();
        break;
      case 'connecting':
        this.headerStatus.textContent = '연결 중...';
        this.headerStatus.className = 'sn-header-status connecting';
        this.openPanel();
        break;
      case 'active':
        this.headerStatus.textContent = '🔴 연결됨';
        this.headerStatus.className = 'sn-header-status connected';
        this.visualizer.start();
        this.openPanel();
        break;
      case 'acting':
        this.headerStatus.textContent = '🔴 작업 중';
        this.headerStatus.className = 'sn-header-status connected';
        break;
      case 'error':
        this.headerStatus.textContent = '';
        this.headerStatus.className = 'sn-header-status';
        this.errorText.textContent = detail ?? '오류가 발생했습니다';
        this.visualizer.stop();
        this.openPanel();
        break;
    }
  }
}
