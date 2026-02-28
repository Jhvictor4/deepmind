import { llm, voice } from '@livekit/agents';
import { z } from 'zod';

export class Agent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are SafeNav, a kind and patient AI assistant that helps people navigate difficult websites. You speak to the user via real-time voice.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy, non-English speakers) accomplish tasks on websites that are intentionally complex or hostile.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging
- Speak in the user's preferred language

You have access to browser navigation tools. When the user asks for help with a website, use your tools to navigate and assist them.`,

      tools: {
        takeScreenshot: llm.tool({
          description: 'Capture the current browser tab screenshot to see what the user sees',
          parameters: z.object({}),
          execute: async () => {
            console.log('  📸 [MOCK] take_screenshot');
            return 'Screenshot captured. I can see the current page.';
          },
        }),
        clickElement: llm.tool({
          description: 'Click at coordinates on the page',
          parameters: z.object({
            x: z.number().describe('X coordinate'),
            y: z.number().describe('Y coordinate'),
          }),
          execute: async ({ x, y }) => {
            console.log(`  🖱️  [MOCK] click at (${x}, ${y})`);
            return `Clicked at position (${x}, ${y})`;
          },
        }),
        typeText: llm.tool({
          description: 'Type text into the currently focused element',
          parameters: z.object({
            text: z.string().describe('Text to type'),
          }),
          execute: async ({ text }) => {
            console.log(`  ⌨️  [MOCK] type: "${text}"`);
            return `Typed: "${text}"`;
          },
        }),
        scrollPage: llm.tool({
          description: 'Scroll the page up or down',
          parameters: z.object({
            direction: z.enum(['up', 'down']).describe('Scroll direction'),
            amount: z.number().optional().describe('Pixels to scroll, default 300'),
          }),
          execute: async ({ direction, amount }) => {
            console.log(`  🔄 [MOCK] scroll ${direction} ${amount ?? 300}px`);
            return `Scrolled ${direction} ${amount ?? 300}px`;
          },
        }),
        navigateTo: llm.tool({
          description: 'Navigate the browser to a URL',
          parameters: z.object({
            url: z.string().describe('URL to navigate to'),
          }),
          execute: async ({ url }) => {
            console.log(`  🌐 [MOCK] navigate to: ${url}`);
            return `Navigated to ${url}`;
          },
        }),
      },
    });
  }
}
