// ============================================
// Session Utilities
// System Message Filtering and Session Helpers
// ============================================

import { SessionInput } from '../types';

/** Patterns for system messages that should be filtered out */
export const SYSTEM_MESSAGE_PATTERNS = [
  /<ide_opened_file>/i,
  /<system-reminder>/i,
  /<tool>/i,
  /<\/tool>/i,
];

/** Check if content contains system message patterns */
export const isSystemContent = (content: string): boolean => {
  return SYSTEM_MESSAGE_PATTERNS.some(pattern => pattern.test(content));
};

/** Get the first non-system input from a session */
export const getFirstValidInput = (inputs: SessionInput[]): SessionInput | null => {
  return inputs.find(input => !isSystemContent(input.display)) || null;
};
