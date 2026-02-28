// ─── Coordinate System ──────────────────────────────────────────────
// Gemini CU uses a normalized 1000×1000 grid (0–999).
// We convert to real pixels before dispatching to the browser.

export interface NormalizedCoord {
  /** 0–999 */
  x: number;
  /** 0–999 */
  y: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

// ─── 14 Gemini CU Actions ──────────────────────────────────────────

export interface ClickAction {
  type: 'click_at';
  x: number;
  y: number;
}

export interface TypeTextAction {
  type: 'type_text_at';
  x: number;
  y: number;
  text: string;
  clearBefore?: boolean;
  pressEnter?: boolean;
}

export interface ScrollDocumentAction {
  type: 'scroll_document';
  direction: ScrollDirection;
}

export interface ScrollAtAction {
  type: 'scroll_at';
  x: number;
  y: number;
  direction: ScrollDirection;
}

export interface HoverAction {
  type: 'hover_at';
  x: number;
  y: number;
}

export interface NavigateAction {
  type: 'navigate';
  url: string;
}

export interface SearchAction {
  type: 'search';
}

export interface GoBackAction {
  type: 'go_back';
}

export interface GoForwardAction {
  type: 'go_forward';
}

export interface OpenBrowserAction {
  type: 'open_web_browser';
}

export interface WaitAction {
  type: 'wait_5_seconds';
}

export interface KeyCombinationAction {
  type: 'key_combination';
  keys: string;
}

export interface DragAndDropAction {
  type: 'drag_and_drop';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type BrowserAction =
  | ClickAction
  | TypeTextAction
  | ScrollDocumentAction
  | ScrollAtAction
  | HoverAction
  | NavigateAction
  | SearchAction
  | GoBackAction
  | GoForwardAction
  | OpenBrowserAction
  | WaitAction
  | KeyCombinationAction
  | DragAndDropAction;

// ─── Screenshot ─────────────────────────────────────────────────────

export interface ScreenshotResult {
  /** Raw base64 PNG (no data-URL prefix) */
  base64: string;
  width: number;
  height: number;
}

// ─── Agent Loop ─────────────────────────────────────────────────────

export type SafetyDecision = 'allowed' | 'require_confirmation' | 'blocked';

export interface AgentStep {
  index: number;
  action: BrowserAction;
  safetyDecision: SafetyDecision;
  screenshotAfter?: ScreenshotResult;
  /** Timestamp (epoch ms) when the step started */
  timestamp: number;
}

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface AgentState {
  status: AgentStatus;
  task: string;
  steps: AgentStep[];
  error?: string;
}

// ─── Browser Abstraction (callbacks the extension must supply) ──────

export interface BrowserAdapter {
  /** Capture visible tab screenshot → base64 PNG */
  captureScreenshot(): Promise<ScreenshotResult>;
  /** Get current tab URL */
  getTabUrl(): Promise<string>;
  /** Execute a browser action (content script or CDP) */
  executeAction(action: BrowserAction): Promise<void>;
}

// ─── Safety Confirmation Callback ───────────────────────────────────

/**
 * The extension supplies this to prompt the user when
 * Gemini returns safety_decision === "require_confirmation".
 * Return `true` to proceed, `false` to abort.
 */
export type ConfirmationPrompt = (action: BrowserAction, reason?: string) => Promise<boolean>;

// ─── Config ─────────────────────────────────────────────────────────

export interface ComputerUseConfig {
  apiKey: string;
  /** @default "gemini-3-flash-preview" */
  model?: string;
  /** @default "gemini-3.1-pro-preview" */
  fallbackModel?: string;
  /** Maximum steps before the loop auto-stops. @default 50 */
  maxSteps?: number;
  /** Browser adapter (screenshot, url, action execution) */
  browser: BrowserAdapter;
  /** Called when Gemini requests user confirmation */
  onConfirmation: ConfirmationPrompt;
  /** Called on each step for UI updates */
  onStep?: (step: AgentStep) => void;
  /** Called when agent status changes */
  onStatusChange?: (status: AgentStatus, error?: string) => void;
}
