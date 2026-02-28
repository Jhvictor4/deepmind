import type { BrowserAction, PixelCoord, ScrollDirection } from './types.js';

// ─── Coordinate Conversion ──────────────────────────────────────────

/**
 * Convert Gemini's normalized 0–999 coordinate to real pixel position.
 */
export function denormalize(
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number,
): PixelCoord {
  return {
    x: Math.round((x / 1000) * screenWidth),
    y: Math.round((y / 1000) * screenHeight),
  };
}

// ─── Gemini CU function_call → BrowserAction ────────────────────────

/**
 * Message format sent to Chrome extension content script / background.
 * The extension dispatches these via runtime.sendMessage or CDP.
 */
export interface ExtensionMessage {
  action: string;
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  keys?: string;
  direction?: ScrollDirection;
  amount?: number;
  clearBefore?: boolean;
  pressEnter?: boolean;
  endX?: number;
  endY?: number;
}

const SCROLL_AMOUNT_PX = 400;

/**
 * Convert a BrowserAction (with normalized coords) to a pixel-based
 * ExtensionMessage ready to send to the Chrome extension.
 */
export function toExtensionMessage(
  action: BrowserAction,
  screenWidth: number,
  screenHeight: number,
): ExtensionMessage {
  switch (action.type) {
    case 'click_at': {
      const { x, y } = denormalize(action.x, action.y, screenWidth, screenHeight);
      return { action: 'click', x, y };
    }

    case 'type_text_at': {
      const { x, y } = denormalize(action.x, action.y, screenWidth, screenHeight);
      return {
        action: 'type',
        x,
        y,
        text: action.text,
        clearBefore: action.clearBefore,
        pressEnter: action.pressEnter,
      };
    }

    case 'scroll_document':
      return {
        action: 'scroll',
        direction: action.direction,
        amount: SCROLL_AMOUNT_PX,
      };

    case 'scroll_at': {
      const { x, y } = denormalize(action.x, action.y, screenWidth, screenHeight);
      return {
        action: 'scroll',
        x,
        y,
        direction: action.direction,
        amount: SCROLL_AMOUNT_PX,
      };
    }

    case 'hover_at': {
      const { x, y } = denormalize(action.x, action.y, screenWidth, screenHeight);
      return { action: 'hover', x, y };
    }

    case 'navigate':
      return { action: 'navigate', url: action.url };

    case 'search':
      return { action: 'navigate', url: 'https://www.google.com' };

    case 'go_back':
      return { action: 'go_back' };

    case 'go_forward':
      return { action: 'go_forward' };

    case 'open_web_browser':
      return { action: 'new_tab' };

    case 'wait_5_seconds':
      return { action: 'wait', amount: 5000 };

    case 'key_combination':
      return { action: 'key_combination', keys: action.keys };

    case 'drag_and_drop': {
      const start = denormalize(action.startX, action.startY, screenWidth, screenHeight);
      const end = denormalize(action.endX, action.endY, screenWidth, screenHeight);
      return {
        action: 'drag',
        x: start.x,
        y: start.y,
        endX: end.x,
        endY: end.y,
      };
    }
  }
}

// ─── Gemini CU function_call parsing ────────────────────────────────

/**
 * Parse a raw Gemini CU function_call into our typed BrowserAction.
 * The function_call `name` maps to one of our 14 action types,
 * with `args` providing the parameters.
 */
export function parseFunctionCall(name: string, args: Record<string, unknown>): BrowserAction {
  switch (name) {
    case 'click_at':
      return { type: 'click_at', x: num(args.x), y: num(args.y) };

    case 'type_text_at':
      return {
        type: 'type_text_at',
        x: num(args.x),
        y: num(args.y),
        text: String(args.text ?? ''),
        clearBefore: Boolean(args.clear_before),
        pressEnter: Boolean(args.press_enter),
      };

    case 'scroll_document':
      return { type: 'scroll_document', direction: args.direction as ScrollDirection };

    case 'scroll_at':
      return {
        type: 'scroll_at',
        x: num(args.x),
        y: num(args.y),
        direction: args.direction as ScrollDirection,
      };

    case 'hover_at':
      return { type: 'hover_at', x: num(args.x), y: num(args.y) };

    case 'navigate':
      return { type: 'navigate', url: String(args.url ?? '') };

    case 'search':
      return { type: 'search' };

    case 'go_back':
      return { type: 'go_back' };

    case 'go_forward':
      return { type: 'go_forward' };

    case 'open_web_browser':
      return { type: 'open_web_browser' };

    case 'wait_5_seconds':
      return { type: 'wait_5_seconds' };

    case 'key_combination':
      return { type: 'key_combination', keys: String(args.keys ?? '') };

    case 'drag_and_drop':
      return {
        type: 'drag_and_drop',
        startX: num(args.start_x),
        startY: num(args.start_y),
        endX: num(args.end_x),
        endY: num(args.end_y),
      };

    default:
      throw new Error(`Unknown CU action: ${name}`);
  }
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}
