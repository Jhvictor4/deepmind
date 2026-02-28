import type { BrowserAction, ConfirmationPrompt, SafetyDecision } from './types.js';

/**
 * Check the safety decision from the Gemini response and, if confirmation
 * is required, prompt the user via the extension-supplied callback.
 *
 * @returns `true` if the action should proceed, `false` to abort.
 */
export async function checkSafety(
  decision: SafetyDecision,
  action: BrowserAction,
  onConfirmation: ConfirmationPrompt,
  reason?: string,
): Promise<boolean> {
  switch (decision) {
    case 'allowed':
      return true;

    case 'require_confirmation':
      return onConfirmation(action, reason);

    case 'blocked':
      return false;
  }
}

/**
 * Extract the safety_decision field from a Gemini CU function call part.
 * Falls back to 'allowed' if the field is absent (most actions).
 */
export function extractSafetyDecision(
  part: Record<string, unknown>,
): SafetyDecision {
  const raw = part.safety_decision ?? part.safetyDecision;
  if (raw === 'require_confirmation' || raw === 'blocked') return raw;
  return 'allowed';
}
