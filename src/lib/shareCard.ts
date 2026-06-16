/**
 * Design spec §8.3 — the share card, the evangelization vector.
 *
 * Renders a verse or a quote to a 1080×1350 PNG on an offscreen `<canvas>` (the
 * portrait share-sheet sweet spot): a warm-gray field, the text set in EB
 * Garamond, the gold cross and a small "FIDELIS" wordmark, and the citation with
 * its translation abbreviation. Two themes only — Day and Night. The two-accent
 * rule holds here too: gold honors (the cross, the wordmark, the citation), ink
 * carries the text; nothing is purple because nothing on the card is interactive.
 * No imagery and no red-letter (standing rule 3 / §13) — typography on a field.
 *
 * Pure drawing over its inputs and the bundled font; the caller owns the canvas,
 * the share-sheet, and the download. Every shared card is a seed and a citation
 * lesson at once.
 */

export type ShareTheme = "day" | "night";

export interface ShareCardInput {
  /** The verse or quote, verbatim — exactly as the Reader renders it. */
  text: string;
  /** The gold line: a citation ("John 3:16 · DRB") or an author ("St. Augustine"). */
  citation: string;
  /** Optional muted line beneath the citation: a translation name, or work · locus. */
  source?: string;
  theme: ShareTheme;
}

export const CARD_W = 1080;
export const CARD_H = 1350;

/** The day/night tokens from styles.css, frozen here so the card matches the app. */
const PALETTE: Record<ShareTheme, { bg: string; ink: string; muted: string; gold: string }> = {
  day: { bg: "#F4F2EE", ink: "#26241F", muted: "#6E6A61", gold: "#A8862C" },
  night: { bg: "#1B1B1E", ink: "#ECEAE4", muted: "#A19D94", gold: "#D4B254" }
};

/** The bundled Scripture face (§1.4), with the same system fallbacks the app uses. */
const GARAMOND = '"EB Garamond", Georgia, "Times New Roman", serif';

/**
 * Make sure the bundled face is rasterised before we paint — a cold canvas
 * otherwise falls back to a system serif for the first render. Best-effort: if
 * the FontFaceSet API is unavailable or the load fails, the system fallback in
 * GARAMOND still draws something legible.
 */
async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`italic 60px ${GARAMOND}`),
      document.fonts.load(`600 40px ${GARAMOND}`)
    ]);
  } catch {
    // FontFaceSet unavailable or the load failed — the system fallback still draws
  }
}

/** The §1.5 cross icon ("M12 3v18M6.5 8.5h11"), drawn on the canvas at any size. */
function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6; // scaled by the transform → 1.6·s on screen, the icon's weight
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.lineTo(12, 21);
  ctx.moveTo(6.5, 8.5);
  ctx.lineTo(17.5, 8.5);
  ctx.stroke();
  ctx.restore();
}

/** Greedy word-wrap against the current font, to a maximum line width. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw centered text with per-letter spacing, for the wordmark. */
function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
): void {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

/**
 * Paint the card. Sizes the canvas to 1080×1350, fits the text by shrinking the
 * Garamond size until the wrapped block fits the middle band, and centers it.
 * Awaits the bundled font first so the first render isn't a system-serif flash.
 */
export async function renderShareCard(
  canvas: HTMLCanvasElement,
  input: ShareCardInput
): Promise<void> {
  await ensureFonts();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const c = PALETTE[input.theme];

  // The field.
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // A quiet hairline frame, a card edge.
  ctx.strokeStyle = c.muted;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, CARD_W - 92, CARD_H - 92);
  ctx.globalAlpha = 1;

  // The cross, gold, near the top.
  drawCross(ctx, CARD_W / 2, 212, 76, c.gold);

  // The text — italic Garamond, auto-fit and centered in the middle band.
  const maxTextW = CARD_W - 280;
  const topY = 332;
  const bottomY = 1030;
  const quoted = `“${input.text}”`;
  let size = 66;
  let lines: string[] = [];
  let lineH = 0;
  for (; size >= 26; size -= 2) {
    ctx.font = `italic ${size}px ${GARAMOND}`;
    lines = wrapLines(ctx, quoted, maxTextW);
    lineH = size * 1.34;
    if (lines.length * lineH <= bottomY - topY) break;
  }
  ctx.fillStyle = c.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = topY + (bottomY - topY - lines.length * lineH) / 2 + size;
  for (const ln of lines) {
    ctx.fillText(ln, CARD_W / 2, y);
    y += lineH;
  }

  // The citation, gold — honor.
  ctx.font = `600 40px ${GARAMOND}`;
  ctx.fillStyle = c.gold;
  ctx.fillText(input.citation, CARD_W / 2, 1118);

  // The source, muted.
  if (input.source) {
    ctx.font = `italic 28px ${GARAMOND}`;
    ctx.fillStyle = c.muted;
    ctx.fillText(input.source, CARD_W / 2, 1162);
  }

  // The wordmark — a small gold cross over a letterspaced "FIDELIS".
  drawCross(ctx, CARD_W / 2, 1228, 26, c.gold);
  ctx.font = `600 28px ${GARAMOND}`;
  ctx.fillStyle = c.gold;
  drawSpaced(ctx, "FIDELIS", CARD_W / 2, 1288, 8);
}
