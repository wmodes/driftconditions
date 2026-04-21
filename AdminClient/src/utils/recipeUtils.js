// Recipe processing utils

// Scan lines from 0 through endRow, tracking brace/bracket depth.
// Respects strings (single, double, backtick) and comments (// and /* */).
// Returns { depth } at the end of endRow.
export function scanToRow(lines, endRow) {
  if (endRow < 0) return { depth: 0 };

  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i <= Math.min(endRow, lines.length - 1); i++) {
    const line = lines[i];
    inLineComment = false; // reset each line

    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const next = col + 1 < line.length ? line[col + 1] : '';

      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; col++; }
        continue;
      }
      if (inLineComment) continue;
      if (inString) {
        if (ch === '\\') { col++; continue; } // skip escaped char
        if (ch === stringChar) inString = false;
        continue;
      }

      if (ch === '/' && next === '/') { inLineComment = true; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; col++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; continue; }

      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') depth--;
    }
  }

  return { depth };
}

// Scan forward from startRow with initialDepth, looking for targetChar at targetDepth
// (checked before decrement, so targetDepth is the depth while INSIDE the element).
// Returns the line index where found, or null.
function scanForwardFor(lines, startRow, initialDepth, targetDepth, targetChar) {
  let depth = initialDepth;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = Math.max(0, startRow); i < lines.length; i++) {
    const line = lines[i];
    inLineComment = false;

    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const next = col + 1 < line.length ? line[col + 1] : '';

      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; col++; }
        continue;
      }
      if (inLineComment) continue;
      if (inString) {
        if (ch === '\\') { col++; continue; }
        if (ch === stringChar) inString = false;
        continue;
      }

      if (ch === '/' && next === '/') { inLineComment = true; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; col++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; continue; }

      if (ch === '{' || ch === '[') {
        depth++;
      } else if (ch === '}' || ch === ']') {
        if (depth === targetDepth && ch === targetChar) {
          return i; // found the closing char at the right depth
        }
        depth--;
      }
    }
  }

  return null;
}

// Insert pattern lines after a given line index, return the updated string.
// Strips a leading empty line from the pattern (artifact of template literal newline).
// If the preceding line ends with `}` but no comma, adds one — JSON5 allows trailing
// commas in arrays, and the sibling element we're inserting requires a separator.
function spliceAfterLine(lines, afterLine, pattern) {
  const patternLines = pattern.split('\n');
  if (patternLines[0] === '') patternLines.shift(); // strip leading blank from template literal

  // Ensure the line we're inserting after has a trailing comma
  const before = lines.slice(0, afterLine + 1);
  const trimmed = before[afterLine].trimEnd();
  if (trimmed.endsWith('}')) {
    before[afterLine] = trimmed + ',';
  }

  return [
    ...before,
    ...patternLines,
    ...lines.slice(afterLine + 1),
  ].join('\n');
}

// Insert a new track at an appropriate position near the cursor.
//
// depth >= 3 (inside a track):
//   scan forward for next track `}` at depth 3, insert after it.
//   Fallback: insert before the tracks array `]`.
//
// depth < 3 (in top-level or tracks array, before any track):
//   find the `tracks:` line and insert right after it — new track goes BEFORE
//   any existing tracks rather than after the last one.
export const insertNewTrack = (jsonStr, cursorRow, pattern) => {
  const lines = jsonStr.split('\n');

  // Use depth at the START of the cursor line (= end of previous line)
  const { depth: initialDepth } = scanToRow(lines, cursorRow - 1);

  let insertAfterLine;

  if (initialDepth >= 3) {
    // Inside a track — insert after the current track's closing }
    insertAfterLine = scanForwardFor(lines, cursorRow, initialDepth, 3, '}');
    if (insertAfterLine === null) {
      // No track close ahead — insert before tracks array `]`
      const tracksClose = scanForwardFor(lines, cursorRow, initialDepth, 2, ']');
      insertAfterLine = tracksClose !== null ? tracksClose - 1 : lines.length - 2;
    }
  } else {
    // Cursor is before any tracks (depth <= 2) — insert at START of tracks array
    const tracksClose = scanForwardFor(lines, cursorRow, initialDepth, 2, ']');
    const tracksKeyLine = findTracksKeyLine(lines, cursorRow, tracksClose);
    if (tracksKeyLine !== null) {
      insertAfterLine = tracksKeyLine; // insert right after `tracks: [`
    } else {
      insertAfterLine = tracksClose !== null ? tracksClose - 1 : lines.length - 2;
    }
  }

  return spliceAfterLine(lines, insertAfterLine, pattern);
};

// Find the line containing the `tracks:` key, scanning from startRow up to endRow.
function findTracksKeyLine(lines, startRow, endRow) {
  const limit = endRow != null ? Math.min(endRow, lines.length - 1) : lines.length - 1;
  for (let i = startRow; i <= limit; i++) {
    if (/\btracks\s*:/.test(lines[i])) return i;
  }
  return null;
}

// Insert a new clip at an appropriate position near the cursor.
//
// depth >= 4 (in clips array or inside a clip):
//   scan forward for next clip `}` at depth 5, insert after it.
//   Fallback: insert before the clips array `]`.
//
// depth < 4 (in track header, before clips array):
//   find the `clips:` line and insert right after it — new clip goes BEFORE
//   any existing clips rather than after the last one.
export const insertNewClip = (jsonStr, cursorRow, pattern) => {
  const lines = jsonStr.split('\n');

  const { depth: initialDepth } = scanToRow(lines, cursorRow - 1);

  let insertAfterLine;

  if (initialDepth >= 4) {
    // Already in clips array or inside a clip — insert after next clip close
    insertAfterLine = scanForwardFor(lines, cursorRow, initialDepth, 5, '}');
    if (insertAfterLine === null) {
      // No clip close ahead — insert before clips array `]`
      const clipsClose = scanForwardFor(lines, cursorRow, initialDepth, 4, ']');
      insertAfterLine = clipsClose !== null ? clipsClose - 1 : lines.length - 2;
    }
  } else {
    // Cursor is in the track header (depth <= 3) — insert at START of clips array
    // Find the track close first so we don't scan past it
    const trackCloseLine = scanForwardFor(lines, cursorRow, initialDepth, 3, '}');
    const clipsKeyLine = findClipsKeyLine(lines, cursorRow, trackCloseLine);
    if (clipsKeyLine !== null) {
      insertAfterLine = clipsKeyLine; // insert right after `clips: [`
    } else if (trackCloseLine !== null) {
      insertAfterLine = trackCloseLine - 1;
    } else {
      insertAfterLine = lines.length - 2;
    }
  }

  return spliceAfterLine(lines, insertAfterLine, pattern);
};

// Find the line containing the `clips:` key, scanning from startRow up to endRow.
// Uses a regex so it works regardless of spacing around the colon.
function findClipsKeyLine(lines, startRow, endRow) {
  const limit = endRow != null ? Math.min(endRow, lines.length - 1) : lines.length - 1;
  for (let i = startRow; i <= limit; i++) {
    if (/\bclips\s*:/.test(lines[i])) return i;
  }
  return null;
}
