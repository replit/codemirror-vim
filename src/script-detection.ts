/**
 * Script detection utilities for context-aware cursor rendering
 *
 * This module provides functions to detect the script type (Latin, Arabic, etc.)
 * of characters to enable appropriate cursor rendering strategies.
 */

import { EditorView } from "@codemirror/view"

/**
 * Enum representing different script types
 */
export enum ScriptType {
  LATIN = 'latin',
  ARABIC_RTL = 'arabic-rtl',
  OTHER = 'other'
}

/**
 * Result of script type detection
 */
export interface ScriptDetectionResult {
  /** The detected script type */
  type: ScriptType;
  /** Whether this character requires special cursor rendering */
  requiresSpecialCursor: boolean;
  /** Whether this is a connected/cursive script */
  isConnectedScript: boolean;
}

/**
 * Detects the script type of a given character based on Unicode ranges
 *
 * @param char - The character to analyze
 * @returns Script detection result with type and rendering hints
 */
export function detectScriptType(char: string): ScriptDetectionResult {
  if (!char || char.length === 0) {
    return {
      type: ScriptType.LATIN,
      requiresSpecialCursor: false,
      isConnectedScript: false
    };
  }

  const codePoint = char.codePointAt(0);
  if (!codePoint) {
    return {
      type: ScriptType.LATIN,
      requiresSpecialCursor: false,
      isConnectedScript: false
    };
  }

  // Arabic script ranges (letters and diacritics that don't break connections)
  // Exclude only punctuation marks that break word boundaries
  //
  // Arabic punctuation (word breakers):
  // U+060C (comma), U+061B (semicolon), U+061F (question mark)
  // U+06D4 (full stop), and other punctuation marks
  const isArabicPunctuation = codePoint === 0x060C || // Arabic comma
                               codePoint === 0x061B || // Arabic semicolon
                               codePoint === 0x061F || // Arabic question mark
                               codePoint === 0x06D4 || // Arabic full stop
                               codePoint === 0x06DD || // Arabic end of ayah
                               codePoint === 0x06DE || // Start of rub el hizb
                               codePoint === 0x06E9;   // Place of sajdah

  // Arabic script ranges (includes letters and diacritics)
  const isInArabicRange = (codePoint >= 0x0600 && codePoint <= 0x06FF) ||
                          (codePoint >= 0x0750 && codePoint <= 0x077F) ||
                          (codePoint >= 0x08A0 && codePoint <= 0x08FF) ||
                          (codePoint >= 0xFB50 && codePoint <= 0xFDFF) ||
                          (codePoint >= 0xFE70 && codePoint <= 0xFEFF);

  if (isInArabicRange && !isArabicPunctuation) {
    return {
      type: ScriptType.ARABIC_RTL,
      requiresSpecialCursor: true,
      isConnectedScript: true
    };
  }

  // Hebrew (RTL but not connected)
  // U+0590–U+05FF
  if (codePoint >= 0x0590 && codePoint <= 0x05FF) {
    return {
      type: ScriptType.OTHER,
      requiresSpecialCursor: false, // Hebrew doesn't need special cursor
      isConnectedScript: false
    };
  }

  // Syriac (connected RTL script)
  // U+0700–U+074F
  if (codePoint >= 0x0700 && codePoint <= 0x074F) {
    return {
      type: ScriptType.ARABIC_RTL,
      requiresSpecialCursor: true,
      isConnectedScript: true
    };
  }

  // N'Ko (connected RTL script)
  // U+07C0–U+07FF
  if (codePoint >= 0x07C0 && codePoint <= 0x07FF) {
    return {
      type: ScriptType.ARABIC_RTL,
      requiresSpecialCursor: true,
      isConnectedScript: true
    };
  }

  // Default: Latin/other scripts use standard cursor
  return {
    type: ScriptType.LATIN,
    requiresSpecialCursor: false,
    isConnectedScript: false
  };
}

/**
 * Checks if a character is neutral (space, punctuation, number)
 * Neutral characters take the script type of their surrounding context
 *
 * @param char - The character to check
 * @returns True if the character is neutral
 */
export function isNeutralChar(char: string): boolean {
  if (!char || char.length === 0) return false;

  const code = char.charCodeAt(0);

  // Spaces, punctuation, numbers, and common symbols
  return (code >= 0x0020 && code <= 0x002F) || // Space and basic punctuation
         (code >= 0x0030 && code <= 0x0039) || // Numbers 0-9
         (code >= 0x003A && code <= 0x0040) || // More punctuation (:;<=>?@)
         (code >= 0x005B && code <= 0x0060) || // Brackets and backtick
         (code >= 0x007B && code <= 0x007E) || // Braces and tilde
         code === 0x00A0;                       // Non-breaking space
}

/**
 * Detects script type with context awareness for neutral characters
 *
 * If the character at the cursor position is neutral (space, number, punctuation),
 * this function checks the surrounding characters to determine the appropriate
 * script context.
 *
 * @param view - The editor view
 * @param pos - The cursor position
 * @returns Script detection result considering surrounding context
 */
export function detectScriptTypeWithContext(
  view: EditorView,
  pos: number
): ScriptDetectionResult {
  const char = view.state.sliceDoc(pos, pos + 1);
  const detection = detectScriptType(char);

  // Spaces and whitespace should NEVER be treated as connected script
  // They are always word boundaries
  if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
    return {
      type: ScriptType.LATIN,
      requiresSpecialCursor: false,
      isConnectedScript: false
    };
  }

  // If character is neutral (punctuation, number),
  // check surrounding context
  if (!detection.requiresSpecialCursor && isNeutralChar(char)) {
    // Check 3 chars before and after for context
    const contextRange = 3;
    const before = view.state.sliceDoc(
      Math.max(0, pos - contextRange),
      pos
    );
    const after = view.state.sliceDoc(
      pos + 1,
      Math.min(view.state.doc.length, pos + 1 + contextRange)
    );

    // If surrounded by Arabic, treat as Arabic context
    const hasArabicBefore = [...before].some(c => detectScriptType(c).isConnectedScript);
    const hasArabicAfter = [...after].some(c => detectScriptType(c).isConnectedScript);

    if (hasArabicBefore || hasArabicAfter) {
      return {
        type: ScriptType.ARABIC_RTL,
        requiresSpecialCursor: true,
        isConnectedScript: true
      };
    }
  }

  return detection;
}
