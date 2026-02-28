import { GoogleGenAI } from '@google/genai';
import { parseFunctionCall } from './actions.js';
import { checkSafety, extractSafetyDecision } from './safety.js';
import { MIN_CAPTURE_INTERVAL_MS } from './screenshot.js';
import type {
  AgentState,
  AgentStep,
  BrowserAction,
  ComputerUseConfig,
  SafetyDecision,
  ScreenshotResult,
} from './types.js';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.1-pro-preview';
const DEFAULT_MAX_STEPS = 50;

// ─── Gemini response helpers ────────────────────────────────────────

interface ParsedCall {
  name: string;
  action: BrowserAction;
  safetyDecision: SafetyDecision;
}

function extractFunctionCalls(candidate: Record<string, any>): ParsedCall[] {
  const parts: any[] = candidate?.content?.parts ?? [];
  const calls: ParsedCall[] = [];

  for (const part of parts) {
    const fc = part.functionCall;
    if (!fc) continue;
    calls.push({
      name: fc.name,
      action: parseFunctionCall(fc.name, fc.args ?? {}),
      safetyDecision: extractSafetyDecision(fc),
    });
  }

  return calls;
}

function hasTextResponse(candidate: Record<string, any>): boolean {
  const parts: any[] = candidate?.content?.parts ?? [];
  return parts.some((p) => typeof p.text === 'string' && p.text.length > 0);
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Agent Loop ─────────────────────────────────────────────────────

export class ComputerUseAgent {
  private ai: GoogleGenAI;
  private model: string;
  private fallbackModel: string;
  private maxSteps: number;
  private config: ComputerUseConfig;
  private aborted = false;

  readonly state: AgentState = {
    status: 'idle',
    task: '',
    steps: [],
  };

  constructor(config: ComputerUseConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.fallbackModel = config.fallbackModel ?? FALLBACK_MODEL;
    this.maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;
  }

  /** Abort a running loop. The current step will finish, then the loop exits. */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Run the screenshot → Gemini CU → action loop until the model
   * indicates the task is done, the max steps are reached, or aborted.
   */
  async run(task: string): Promise<AgentState> {
    this.aborted = false;
    this.state.task = task;
    this.state.steps = [];
    this.state.error = undefined;
    this.setStatus('running');

    const contents: any[] = [];
    let currentModel = this.model;

    try {
      // 1. Initial screenshot + task
      const screenshot = await this.config.browser.captureScreenshot();
      contents.push({
        role: 'user',
        parts: [
          { text: task },
          { inlineData: { mimeType: 'image/png', data: screenshot.base64 } },
        ],
      });

      for (let stepIdx = 0; stepIdx < this.maxSteps; stepIdx++) {
        if (this.aborted) {
          this.setStatus('paused');
          return this.state;
        }

        // 2. Call Gemini CU
        let response: any;
        try {
          response = await this.callModel(currentModel, contents);
        } catch (err: any) {
          // Fallback to stronger model on failure
          if (currentModel !== this.fallbackModel) {
            currentModel = this.fallbackModel;
            response = await this.callModel(currentModel, contents);
          } else {
            throw err;
          }
        }

        const candidate = response.candidates?.[0];
        if (!candidate) {
          throw new Error('No candidate in Gemini response');
        }

        // Push the assistant turn into conversation history
        contents.push(candidate.content);

        // 3. Extract function calls
        const calls = extractFunctionCalls(candidate);

        // If no function calls and model produced text → task is done
        if (calls.length === 0) {
          if (hasTextResponse(candidate)) {
            this.setStatus('completed');
            return this.state;
          }
          // No calls and no text — treat as done
          this.setStatus('completed');
          return this.state;
        }

        // 4. Execute each action
        const functionResponses: any[] = [];

        for (const call of calls) {
          if (this.aborted) {
            this.setStatus('paused');
            return this.state;
          }

          // Safety check
          const proceed = await checkSafety(
            call.safetyDecision,
            call.action,
            this.config.onConfirmation,
          );
          if (!proceed) {
            this.setStatus('paused');
            return this.state;
          }

          // Execute the action via the browser adapter
          await this.config.browser.executeAction(call.action);

          // Wait for page to settle + respect rate limit
          await sleep(MIN_CAPTURE_INTERVAL_MS);

          // Capture new screenshot
          const newScreenshot = await this.config.browser.captureScreenshot();
          const tabUrl = await this.config.browser.getTabUrl();

          // Record step
          const step: AgentStep = {
            index: stepIdx,
            action: call.action,
            safetyDecision: call.safetyDecision,
            screenshotAfter: newScreenshot,
            timestamp: Date.now(),
          };
          this.state.steps.push(step);
          this.config.onStep?.(step);

          // Build function response with new screenshot
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { url: tabUrl },
            },
          });

          // Also attach the new screenshot as inline data
          functionResponses.push({
            inlineData: {
              mimeType: 'image/png',
              data: newScreenshot.base64,
            },
          });
        }

        // 5. Send function responses + screenshots back to model
        contents.push({
          role: 'user',
          parts: functionResponses,
        });
      }

      // Exhausted max steps
      this.state.error = `Reached maximum steps (${this.maxSteps})`;
      this.setStatus('error');
    } catch (err: any) {
      this.state.error = err.message ?? String(err);
      this.setStatus('error');
    }

    return this.state;
  }

  private async callModel(model: string, contents: any[]): Promise<any> {
    return this.ai.models.generateContent({
      model,
      contents,
      config: {
        tools: [
          {
            computerUse: { environment: 'ENVIRONMENT_BROWSER' },
          },
        ],
      },
    });
  }

  private setStatus(status: AgentState['status'], error?: string): void {
    this.state.status = status;
    if (error) this.state.error = error;
    this.config.onStatusChange?.(status, error);
  }
}
