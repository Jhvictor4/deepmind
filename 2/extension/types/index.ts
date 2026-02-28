// ── SafeNav Shared Types ──

// Bar state machine
export type BarState = 'idle' | 'connecting' | 'active' | 'acting' | 'error';

// Browser actions the agent can execute
export interface ClickAction {
  type: 'click';
  x: number;
  y: number;
}

export interface TypeAction {
  type: 'type';
  text: string;
  selector?: string;
}

export interface ScrollAction {
  type: 'scroll';
  direction: 'up' | 'down';
  amount: number;
}

export type BrowserAction = ClickAction | TypeAction | ScrollAction;

// ── Message Protocol: Content Script ↔ Background ──

export type Message =
  | { type: 'START_SESSION' }
  | { type: 'STOP_SESSION' }
  | { type: 'SESSION_STARTED' }
  | { type: 'SESSION_STOPPED' }
  | { type: 'SESSION_ERROR'; error: string }
  | { type: 'SCREENSHOT_REQUEST' }
  | { type: 'SCREENSHOT_RESULT'; data: string } // base64
  | { type: 'EXECUTE_ACTION'; action: BrowserAction }
  | { type: 'ACTION_RESULT'; success: boolean; error?: string }
  | { type: 'AUDIO_DATA'; data: string } // base64 PCM
  | { type: 'PLAY_AUDIO'; data: string } // base64 PCM
  | { type: 'TRANSCRIPTION'; speaker: 'user' | 'agent'; text: string }
  | { type: 'STATUS_UPDATE'; status: BarState; detail?: string }
  | { type: 'HIGHLIGHT_ELEMENT'; selector: string; label?: string }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'TASK_PROGRESS'; current: number; total: number; description: string };

// Session state managed by the background service worker
export interface SessionState {
  active: boolean;
  tabId: number | null;
  taskContext: string;
  currentStep: number;
  totalSteps: number;
}
