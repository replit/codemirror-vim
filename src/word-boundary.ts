/**
 * Word boundary detection for connected scripts
 *
 * This module provides functions to detect word boundaries in connected scripts
 * like Arabic, where visual word boundaries are determined by character joining
 * behavior rather than just whitespace.
 */

import { EditorView } from "@codemirror/view"
import { detectScriptType } from "./script-detection"

/**
 * Represents the boundaries of a word in the document
 */
export interface WordBoundary {
  /** Absolute position where the word starts (inclusive) */
  start: number;
  /** Absolute position where the word ends (exclusive) */
  end: number;
  /** The text content of the word */
  text: string;
}

/**
 * Maximum number of characters to search in each direction when finding word boundaries.
 * This prevents performance issues with very long lines while still covering typical word lengths.
 */
export const MAX_WORD_SEARCH_RANGE = 50;

/**
 * Finds the boundaries of an Arabic/connected word at the given cursor position
 *
 * A word boundary is defined by a transition:
 * - FROM: anything (non-Arabic) TO: Arabic letter (word starts)
 * - FROM: Arabic letter TO: anything that is not Arabic (word ends)
 *
 * For example, in "TOOمودا", the word "مودا" has clear boundaries:
 * - Starts at the transition from "O" (Latin) to "م" (Arabic)
 * - Ends at the transition from "ا" (Arabic) to end of text
 *
 * @param view - The editor view
 * @param cursorPos - The cursor position within the word
 * @returns Word boundary information, or null if no valid word found
 */
export function findArabicWordBoundaries(
  view: EditorView,
  cursorPos: number
): WordBoundary | null {
  const linePos = view.state.doc.lineAt(cursorPos);
  const lineText = linePos.text;
  const offsetInLine = cursorPos - linePos.from;

  // Clamp search range to prevent performance issues with very long lines
  const searchStart = Math.max(0, offsetInLine - MAX_WORD_SEARCH_RANGE);
  const searchEnd = Math.min(lineText.length, offsetInLine + MAX_WORD_SEARCH_RANGE);

  // Start from cursor and expand in both directions
  let start = offsetInLine;
  let end = offsetInLine + 1;

  // Expand leftward - continue while we have Arabic/connected characters
  while (start > searchStart) {
    const char = lineText[start - 1];
    const detection = detectScriptType(char);

    // Stop when we hit a non-Arabic character (this is the word boundary)
    if (!detection.isConnectedScript) {
      break;
    }

    start--;
  }

  // Expand rightward - continue while we have Arabic/connected characters
  while (end < searchEnd) {
    const char = lineText[end];
    const detection = detectScriptType(char);

    // Stop when we hit a non-Arabic character (this is the word boundary)
    if (!detection.isConnectedScript) {
      break;
    }

    end++;
  }

  // Convert line-relative positions to document-absolute positions
  const absoluteStart = linePos.from + start;
  const absoluteEnd = linePos.from + end;

  // Validate that we found a meaningful word
  if (absoluteStart >= absoluteEnd) {
    return null;
  }

  return {
    start: absoluteStart,
    end: absoluteEnd,
    text: lineText.substring(start, end)
  };
}
