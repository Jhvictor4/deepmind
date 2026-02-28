// Agent loop
export { ComputerUseAgent } from './agent-loop.js';

// Actions
export { denormalize, toExtensionMessage, parseFunctionCall } from './actions.js';
export type { ExtensionMessage } from './actions.js';

// Screenshot utilities
export { buildScreenshot, stripDataUrlPrefix, CAPTURE_OPTIONS, MIN_CAPTURE_INTERVAL_MS } from './screenshot.js';

// Safety
export { checkSafety, extractSafetyDecision } from './safety.js';

// Types
export type {
  BrowserAction,
  ClickAction,
  TypeTextAction,
  ScrollDocumentAction,
  ScrollAtAction,
  HoverAction,
  NavigateAction,
  SearchAction,
  GoBackAction,
  GoForwardAction,
  OpenBrowserAction,
  WaitAction,
  KeyCombinationAction,
  DragAndDropAction,
  ScrollDirection,
  NormalizedCoord,
  PixelCoord,
  ScreenshotResult,
  SafetyDecision,
  AgentStep,
  AgentState,
  AgentStatus,
  BrowserAdapter,
  ConfirmationPrompt,
  ComputerUseConfig,
} from './types.js';
