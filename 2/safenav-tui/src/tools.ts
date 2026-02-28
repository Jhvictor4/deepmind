/**
 * SafeNav — Browser navigation tool definitions for Gemini Live API function calling.
 * Execution bodies are mock (console.log) — real implementations come from Chrome Extension.
 */

import { Type, type FunctionDeclaration } from '@google/genai';

// ─── Tool Declarations (registered with Gemini session) ─────────────────────

export const browserTools: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: 'take_screenshot',
        description: 'Capture the current browser tab screenshot',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'click_element',
        description: 'Click at coordinates on the page',
        parameters: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER, description: 'X coordinate' },
            y: { type: Type.NUMBER, description: 'Y coordinate' },
          },
          required: ['x', 'y'],
        },
      },
      {
        name: 'type_text',
        description: 'Type text into the currently focused element',
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'Text to type' },
          },
          required: ['text'],
        },
      },
      {
        name: 'scroll_page',
        description: 'Scroll the page up or down',
        parameters: {
          type: Type.OBJECT,
          properties: {
            direction: {
              type: Type.STRING,
              enum: ['up', 'down'],
              description: 'Scroll direction',
            },
            amount: {
              type: Type.NUMBER,
              description: 'Pixels to scroll (default 300)',
            },
          },
          required: ['direction'],
        },
      },
      {
        name: 'navigate_to',
        description: 'Navigate the browser to a URL',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'URL to navigate to' },
          },
          required: ['url'],
        },
      },
    ],
  },
];

// ─── Mock Execution (replace with Chrome Extension bridge later) ─────────────

export async function executeBrowserAction(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'take_screenshot':
      console.log('  📸 [MOCK] take_screenshot');
      return JSON.stringify({
        success: true,
        message: 'Screenshot captured (mock)',
        width: 1920,
        height: 1080,
      });

    case 'click_element':
      console.log(`  🖱️  [MOCK] click_element at (${args.x}, ${args.y})`);
      return JSON.stringify({
        success: true,
        message: `Clicked at (${args.x}, ${args.y})`,
      });

    case 'type_text':
      console.log(`  ⌨️  [MOCK] type_text: "${args.text}"`);
      return JSON.stringify({
        success: true,
        message: `Typed: "${args.text}"`,
      });

    case 'scroll_page':
      console.log(`  🔄 [MOCK] scroll_page: ${args.direction} ${args.amount ?? 300}px`);
      return JSON.stringify({
        success: true,
        message: `Scrolled ${args.direction} ${args.amount ?? 300}px`,
      });

    case 'navigate_to':
      console.log(`  🌐 [MOCK] navigate_to: ${args.url}`);
      return JSON.stringify({
        success: true,
        message: `Navigated to ${args.url}`,
      });

    default:
      console.log(`  ⚠️  Unknown tool: ${name}`);
      return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
  }
}
