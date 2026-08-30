/**
 * Managed-software log text arrives raw from installer output: ANSI colour
 * escapes, Windows line endings, trailing whitespace, runs of blank lines.
 * Every renderer reads it through here so the text is plain and line breaks
 * survive into the page.
 */

const ANSI = /\u001b\[[0-9;]*[A-Za-z]|\u001b/g

export function cleanLogText(raw: unknown): string {
  return String(raw ?? '')
    .replace(ANSI, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** The first line stands as the message; the remainder is the detail block. */
export function splitLogText(raw: unknown): { message: string; details?: string } {
  const text = cleanLogText(raw)
  const nl = text.indexOf('\n')
  if (nl === -1) return { message: text }
  return { message: text.slice(0, nl).trim(), details: text.slice(nl + 1).trim() || undefined }
}
