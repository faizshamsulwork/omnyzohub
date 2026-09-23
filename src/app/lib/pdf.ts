import type { jsPDF, GState } from "jspdf";
import { COMPANY_PROFILE, companyFooterText } from "./company";

/**
 * Vector PDF builder.
 *
 * Documents are drawn straight onto the PDF canvas with real text runs, so the
 * output stays selectable, searchable and sharp at any zoom. Nothing here reads
 * the DOM — every page is rendered from the document model below.
 *
 * Free-text fields (item descriptions, notes, terms) accept a small markdown
 * subset so users get real formatting without a rich-text editor:
 *   **bold**, *italic*, and a line starting with "- " or "* " becomes a bullet.
 */

export type RGB = [number, number, number];

export const PDF_COLORS = {
  black: [0, 0, 0] as RGB,
  body: [55, 65, 81] as RGB,
  muted: [107, 114, 128] as RGB,
  rule: [229, 231, 235] as RGB,
  ruleFaint: [243, 244, 246] as RGB,
  shade: [249, 250, 251] as RGB,
  danger: [239, 68, 68] as RGB,
  success: [21, 128, 61] as RGB,
  successTint: [240, 253, 244] as RGB,
  purple: [107, 33, 168] as RGB,
  purpleTint: [250, 245, 255] as RGB,
  amber: [146, 64, 14] as RGB,
  amberTint: [255, 251, 235] as RGB,
};

export interface PdfMetaRow {
  label: string;
  value: string;
  color?: RGB;
  strong?: boolean;
}

export interface PdfColumn {
  header: string;
  /** Share of the table width, in percent. */
  width: number;
  align: "left" | "center" | "right";
}

export interface PdfLineRow {
  type: "item" | "title";
  /**
   * Markdown-lite text. When it has more than one line, the first line
   * becomes a bold heading and every following line renders as a bullet
   * (any leading "-"/"*"/"•" marker is stripped first). A single line
   * renders as plain body text. Supports **bold** and *italic* inline.
   */
  description: string;
  /** Plain muted line under the description — never bulleted or bolded. */
  subtitle?: string;
  /** Small bold uppercase callout line, e.g. "Paid personally for: X". */
  footnote?: string;
  /** One entry per column after the description column. */
  values?: string[];
}

export interface PdfTotalRow {
  label: string;
  value: string;
  color?: RGB;
}

export interface PdfCallout {
  heading: string;
  body: string;
  color?: RGB;
  tint?: RGB;
}

export type PdfPanel =
  | {
      kind: "box";
      heading: string;
      rows?: { label: string; value: string; color?: RGB }[];
      text?: string;
      borderColor?: RGB;
    }
  | { kind: "notes"; blocks: { heading: string; body: string }[] }
  | { kind: "signature"; caption: string; subCaption?: string; imageUrl?: string }
  | { kind: "acceptance"; heading: string; intro: string; fields: string[] };

export interface PdfDocumentModel {
  filename: string;
  /** Big heading on the first page, e.g. "INVOICE". */
  title: string;
  titleColor?: RGB;
  accent?: RGB;
  meta: PdfMetaRow[];
  party: {
    heading: string;
    name: string;
    lines: { text: string; strong?: boolean; color?: RGB; size?: number }[];
    callout?: PdfCallout;
  };
  columns: PdfColumn[];
  rows: PdfLineRow[];
  totals?: PdfTotalRow[];
  grandTotal?: PdfTotalRow & { tint?: RGB };
  panels?: (PdfPanel | null)[];
  closingNote?: { title: string; subtitle: string };
  watermark?: string;
  subject?: string;
  keywords?: string[];
  /**
   * Plain-text structured data (one "Key: value" fact per line) embedded as
   * invisible 1pt white text in the top-left corner of page 1. Lets external
   * OCR/ingestion tooling — accounting imports, e-Invoice compliance systems —
   * read exact field values straight off the PDF instead of parsing the
   * visible layout.
   */
  machineReadableText?: string;
}

const PAGE = { width: 210, height: 297 };
const MARGIN = { x: 16, top: 16, bottom: 24 };
const CONTENT_WIDTH = PAGE.width - MARGIN.x * 2;
const CONTENT_BOTTOM = PAGE.height - MARGIN.bottom;
const LOGO_SIZE = 15;

/** 1pt in mm, plus standard body leading — the basis for every line-height in this file. */
const PT_TO_MM = 0.352778;
function lineHeightMm(sizePt: number, leading = 1.32) {
  return sizePt * PT_TO_MM * leading;
}

/** Standard PDF fonts cover WinAnsi only; anything else cannot be drawn as text. */
const UNSUPPORTED_CHARACTER = /[^ -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;

export function findUnsupportedCharacters(model: PdfDocumentModel) {
  const found = new Set<string>();

  const scan = (value: unknown) => {
    if (typeof value === "string") {
      // Markdown markers (*, -) are stripped before rendering, not printed —
      // exclude them so they never trigger a false "can't print this" warning.
      // \n/\r/\t are structural line/tab breaks, never drawn as glyphs, so they
      // must not trip UNSUPPORTED_CHARACTER (its range starts at U+0020 and
      // sits above all three).
      const printable = value
        .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, "$1$2")
        .replace(/^[-*•]\s+/gm, "")
        .replace(/[\n\r\t]/g, "");
      for (const character of printable) {
        if (UNSUPPORTED_CHARACTER.test(character)) found.add(character);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(scan);
    }
  };

  scan(model);
  return [...found];
}

/**
 * Loads an asset and downsamples it to `maxPixels` on its longest edge before
 * embedding. The source artwork is far larger than the few millimetres it
 * occupies on the page, and embedding it raw inflates every PDF by megabytes.
 */
export async function loadImageAsDataUrl(url: string, maxPixels = 600) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxPixels / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Markdown-lite rich text: **bold**, *italic*, and "- "/"* " bullet lines.
// jsPDF can only lay out one font style per string, so mixed-style text needs
// its own word-by-word wrap instead of splitTextToSize.
// ---------------------------------------------------------------------------

interface RichRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

interface RichToken extends RichRun {
  width: number;
}

interface RichLine {
  bulleted: boolean;
  indent: number;
  size: number;
  color: RGB;
  tokens: RichToken[];
}

const BULLET_INDENT = 3.6;

function parseInlineMarkdown(text: string, baseBold: boolean, baseItalic: boolean): RichRun[] {
  const runs: RichRun[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), bold: baseBold, italic: baseItalic });
    }
    if (match[1] !== undefined) {
      runs.push({ text: match[1], bold: true, italic: baseItalic });
    } else if (match[2] !== undefined) {
      runs.push({ text: match[2], bold: baseBold, italic: true });
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: baseBold, italic: baseItalic });
  }

  return runs.filter((run) => run.text.length > 0);
}

function richFontStyle(bold: boolean, italic: boolean) {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

/**
 * Greedy word-wrap across mixed-style runs, splitting on whitespace only.
 *
 * jsPDF's getTextWidth() under-measures a lone space character relative to
 * how the same space renders inside a single drawn string (confirmed by
 * comparing word-by-word Td placement against one Tj call for the same
 * text) — drawing word-by-word visibly glues some pairs together. So wrap
 * decisions use per-word measurement, but same-style neighbours are merged
 * back into one string before they're handed off for drawing.
 */
function wrapRuns(doc: jsPDF, runs: RichRun[], maxWidth: number, size: number): RichToken[][] {
  doc.setFontSize(size);
  const measure = (str: string, bold: boolean, italic: boolean) => {
    doc.setFont("helvetica", richFontStyle(bold, italic));
    return doc.getTextWidth(str);
  };

  const words: RichRun[] = [];
  runs.forEach((run) => {
    // Keep whitespace as its own token so wrapping can drop it at line breaks.
    run.text.split(/(\s+)/).forEach((piece) => {
      if (piece === "") return;
      words.push({ text: piece, bold: run.bold, italic: run.italic });
    });
  });

  const lines: RichRun[][] = [];
  let current: RichRun[] = [];
  let currentWidth = 0;

  words.forEach((word) => {
    const isSpace = /^\s+$/.test(word.text);
    const width = measure(word.text, word.bold, word.italic);
    if (!isSpace && current.length > 0 && currentWidth + width > maxWidth) {
      lines.push(current);
      current = [];
      currentWidth = 0;
    }
    if (isSpace && current.length === 0) return; // no leading space on a fresh line
    current.push(word);
    currentWidth += width;
  });
  if (current.length > 0) lines.push(current);

  // Widow control: a short final fragment (e.g. a lone "2)" off "(Month 2)")
  // must never end up orphaned alone on the last line — fold it back onto
  // the line above rather than leave it dangling by itself. Only when that
  // still fits within a small tolerance of maxWidth, so the fold-back can
  // never bleed text into whatever sits to the right of this column.
  if (lines.length > 1) {
    const lastLine = lines[lines.length - 1];
    const words = lastLine.filter((word) => !/^\s+$/.test(word.text));
    if (words.length === 1 && words[0].text.length <= 4) {
      const prevLine = lines[lines.length - 2];
      const prevWidth = prevLine.reduce((sum, word) => sum + measure(word.text, word.bold, word.italic), 0);
      const orphanWidth = measure(words[0].text, words[0].bold, words[0].italic);
      if (prevWidth + orphanWidth <= maxWidth + 2) {
        const orphan = lines.pop() as RichRun[];
        lines[lines.length - 1].push(...orphan);
      }
    }
  }

  const trimmed = lines.map((line) => (line.length && /^\s+$/.test(line[line.length - 1].text) ? line.slice(0, -1) : line));

  // Merge consecutive same-style words (with their in-between spaces) into one
  // run per style span, so each renders through the single-string Tj path.
  return trimmed.map((line) => {
    const merged: RichRun[] = [];
    line.forEach((word) => {
      const last = merged[merged.length - 1];
      if (last && last.bold === word.bold && last.italic === word.italic) {
        last.text += word.text;
      } else {
        merged.push({ text: word.text, bold: word.bold, italic: word.italic });
      }
    });
    return merged.map((run) => ({ ...run, width: measure(run.text, run.bold, run.italic) }));
  });
}

/**
 * Splits a description into rendered lines: 2+ source lines means the first
 * becomes a bold heading and the rest become bullets; a single line renders
 * as plain body text. Inline bold/italic markdown is honoured throughout.
 */
function computeItemLines(doc: jsPDF, text: string, maxWidth: number): RichLine[] {
  const sourceLines = (text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (sourceLines.length === 0) return [];

  const isMultiLine = sourceLines.length > 1;
  const result: RichLine[] = [];

  sourceLines.forEach((sourceLine, index) => {
    const isHeading = index === 0;
    const bulleted = isMultiLine && !isHeading;
    const stripped = bulleted ? sourceLine.replace(/^[-*•]\s+/, "") : sourceLine;
    const size = bulleted ? 7.6 : isHeading && isMultiLine ? 8.4 : 8.4;
    const color = bulleted ? PDF_COLORS.muted : PDF_COLORS.black;
    const runs = parseInlineMarkdown(stripped, isHeading && isMultiLine, false);
    const indent = bulleted ? BULLET_INDENT : 0;
    const wrapped = wrapRuns(doc, runs, maxWidth - indent, size);

    wrapped.forEach((tokens, wrapIndex) => {
      result.push({ bulleted: bulleted && wrapIndex === 0, indent, size, color, tokens });
    });
  });

  return result;
}

/** Freeform prose (notes/terms/box text): every source line stands alone; a
 * "- "/"* " prefix makes it a bullet, everything else is a plain paragraph. */
function computeFreeformLines(doc: jsPDF, text: string, maxWidth: number, size: number, color: RGB): RichLine[] {
  const sourceLines = (text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: RichLine[] = [];

  sourceLines.forEach((sourceLine) => {
    const bulletMatch = sourceLine.match(/^[-*]\s+(.*)$/);
    const bulleted = Boolean(bulletMatch);
    const content = bulletMatch ? bulletMatch[1] : sourceLine;
    const indent = bulleted ? BULLET_INDENT : 0;
    const runs = parseInlineMarkdown(content, false, false);
    const wrapped = wrapRuns(doc, runs, maxWidth - indent, size);

    wrapped.forEach((tokens, wrapIndex) => {
      result.push({ bulleted: bulleted && wrapIndex === 0, indent, size, color, tokens });
    });
  });

  return result;
}

function richLinesHeight(lines: RichLine[]) {
  return lines.reduce((sum, line) => sum + lineHeightMm(line.size), 0);
}

type Assets = { logo?: string | null; signature?: string | null };

class DocumentWriter {
  private doc: jsPDF;
  private gStateCtor: typeof GState;
  y = MARGIN.top;

  constructor(doc: jsPDF, gStateCtor: typeof GState) {
    this.doc = doc;
    this.gStateCtor = gStateCtor;
  }

  get pdf() {
    return this.doc;
  }

  text(
    value: string,
    x: number,
    y: number,
    options: {
      size?: number;
      bold?: boolean;
      italic?: boolean;
      color?: RGB;
      align?: "left" | "center" | "right";
      spacing?: number;
    } = {},
  ) {
    const { size = 9, bold = false, italic = false, color = PDF_COLORS.black, align = "left", spacing = 0 } = options;
    this.doc.setFontSize(size);
    this.doc.setFont("helvetica", richFontStyle(bold, italic));
    this.doc.setTextColor(color[0], color[1], color[2]);
    this.doc.setCharSpace(spacing);
    this.doc.text(value, x, y, { align, baseline: "alphabetic" });
    this.doc.setCharSpace(0);
  }

  wrap(value: string, maxWidth: number, size: number, bold = false) {
    this.doc.setFontSize(size);
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    return this.doc.splitTextToSize(value, maxWidth) as string[];
  }

  paragraph(
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    options: { size?: number; bold?: boolean; color?: RGB; lineHeight?: number; align?: "left" | "center" } = {},
  ) {
    const { size = 9, bold = false, color = PDF_COLORS.black, lineHeight = lineHeightMm(size), align = "left" } = options;
    const lines = this.wrap(value, maxWidth, size, bold);
    lines.forEach((line, index) => {
      this.text(line, x, y + index * lineHeight, { size, bold, color, align });
    });
    return lines.length * lineHeight;
  }

  measureParagraph(value: string, maxWidth: number, size: number, bold = false, lineHeight = lineHeightMm(size)) {
    return this.wrap(value, maxWidth, size, bold).length * lineHeight;
  }

  /** Draws pre-wrapped rich lines (bullets + inline bold/italic) and returns the height used. */
  richLines(lines: RichLine[], x: number, y: number) {
    let cursorY = y;
    lines.forEach((line) => {
      const baseline = cursorY + line.size * PT_TO_MM * 0.92;
      if (line.bulleted) {
        this.text("•", x + 0.4, baseline, { size: line.size, color: line.color });
      }
      let cursorX = x + line.indent;
      line.tokens.forEach((token) => {
        this.text(token.text, cursorX, baseline, { size: line.size, bold: token.bold, italic: token.italic, color: line.color });
        cursorX += token.width;
      });
      cursorY += lineHeightMm(line.size);
    });
    return cursorY - y;
  }

  itemLines(text: string, maxWidth: number) {
    return computeItemLines(this.doc, text, maxWidth);
  }

  freeformLines(text: string, maxWidth: number, size: number, color: RGB) {
    return computeFreeformLines(this.doc, text, maxWidth, size, color);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.2) {
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }

  rect(x: number, y: number, w: number, h: number, style: "F" | "S" | "FD", fill?: RGB, stroke?: RGB, lineWidth = 0.2) {
    if (fill) this.doc.setFillColor(fill[0], fill[1], fill[2]);
    if (stroke) this.doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    this.doc.setLineWidth(lineWidth);
    this.doc.rect(x, y, w, h, style);
  }

  withOpacity(opacity: number, draw: () => void) {
    try {
      this.doc.setGState(new this.gStateCtor({ opacity }));
      draw();
      this.doc.setGState(new this.gStateCtor({ opacity: 1 }));
    } catch {
      draw();
    }
  }

  newPage() {
    this.doc.addPage();
    this.y = MARGIN.top;
  }

  ensureSpace(height: number) {
    if (this.y + height <= CONTENT_BOTTOM) return false;
    this.newPage();
    return true;
  }
}

/** Draws `text` as invisible 1pt white text in the top-left corner of the
 * current page — never shown to a human, but present in the PDF's text
 * layer for OCR/ingestion tooling to read. Doesn't touch writer.y. */
function drawMachineReadableText(writer: DocumentWriter, text: string) {
  if (!text.trim()) return;
  writer.pdf.setFontSize(1);
  writer.pdf.setFont("helvetica", "normal");
  writer.pdf.setTextColor(255, 255, 255);
  const lines = writer.pdf.splitTextToSize(text, PAGE.width - 12);
  writer.pdf.text(lines, 6, 6);
}

function drawWatermark(writer: DocumentWriter, label: string, color: RGB) {
  writer.withOpacity(0.06, () => {
    writer.pdf.setFontSize(72);
    writer.pdf.setFont("helvetica", "bold");
    writer.pdf.setTextColor(color[0], color[1], color[2]);
    writer.pdf.text(label, PAGE.width / 2, PAGE.height / 2, {
      align: "center",
      angle: 14,
      baseline: "middle",
    });
  });
}

function drawHeader(writer: DocumentWriter, model: PdfDocumentModel, assets: Assets) {
  const titleColor = model.titleColor || PDF_COLORS.black;
  const top = writer.y;
  let leftY = top;

  if (assets.logo) {
    try {
      const properties = writer.pdf.getImageProperties(assets.logo);
      const height = LOGO_SIZE;
      const width = (properties.width / properties.height) * height;
      writer.pdf.addImage(assets.logo, "PNG", MARGIN.x, leftY, width, height);
      leftY += height + 4;
    } catch {
      // A missing logo must never block the document.
    }
  }

  writer.text(COMPANY_PROFILE.legalName.toUpperCase(), MARGIN.x, leftY + 3, {
    size: 10,
    bold: true,
    spacing: 0.4,
  });
  leftY += 6.5;

  const companyLines = [
    `Registration No: ${COMPANY_PROFILE.registrationNo}`,
    COMPANY_PROFILE.registeredOffice,
    COMPANY_PROFILE.email,
  ];
  companyLines.forEach((entry) => {
    leftY += writer.paragraph(entry, MARGIN.x, leftY, 82, {
      size: 6.8,
      color: PDF_COLORS.muted,
      lineHeight: lineHeightMm(6.8, 1.25),
    });
  });

  // Right column: document title and meta table.
  const right = PAGE.width - MARGIN.x;
  writer.text(model.title.toUpperCase(), right, top + 8, { size: 22, bold: true, color: titleColor, align: "right" });

  // Labels sit to the left of their value, so a long value pushes its label out
  // instead of printing on top of it.
  const metaValueWidth = Math.max(
    ...model.meta.map((row) => {
      writer.pdf.setFontSize(7.5);
      writer.pdf.setFont("helvetica", row.strong !== false ? "bold" : "normal");
      return writer.pdf.getTextWidth(row.value);
    }),
    22,
  );

  const metaRowHeight = lineHeightMm(7.5, 1.5);
  let metaY = top + 17;
  model.meta.forEach((row) => {
    writer.text(row.label.toUpperCase(), right - metaValueWidth - 3, metaY, {
      size: 7.5,
      bold: true,
      color: row.color || PDF_COLORS.body,
      align: "right",
      spacing: 0.3,
    });
    writer.text(row.value, right, metaY, {
      size: 7.5,
      bold: row.strong !== false,
      color: row.color || PDF_COLORS.black,
      align: "right",
    });
    metaY += metaRowHeight;
  });

  writer.y = Math.max(leftY, metaY - metaRowHeight + 4) + 4;
  writer.line(MARGIN.x, writer.y, PAGE.width - MARGIN.x, writer.y, PDF_COLORS.ruleFaint, 0.6);
  writer.y += 9;
}

/** Mirrors drawParty()'s layout exactly, so ensureSpace() can be called before
 * anything is drawn — a long address, several identifiers, and a reimbursement
 * callout box can otherwise run past the bottom of the page unnoticed. */
function measureParty(writer: DocumentWriter, model: PdfDocumentModel) {
  let height = 6.5 + 7;

  model.party.lines.forEach((line) => {
    const size = line.size || 7.6;
    height += writer.measureParagraph(line.text, CONTENT_WIDTH * 0.68, size, Boolean(line.strong), lineHeightMm(size, 1.25)) + 1.4;
  });

  if (model.party.callout) {
    const bodyHeight = writer.measureParagraph(model.party.callout.body, 69, 8, true, lineHeightMm(8, 1.3));
    height += 2.5 + bodyHeight + 8.5;
  }

  return height + 7;
}

function drawParty(writer: DocumentWriter, model: PdfDocumentModel) {
  writer.ensureSpace(measureParty(writer, model));

  const accent = model.accent || PDF_COLORS.black;
  const textLeft = MARGIN.x + 4;

  const headingTop = writer.y;
  writer.text(model.party.heading.toUpperCase(), textLeft, writer.y + 2.6, {
    size: 7,
    bold: true,
    color: PDF_COLORS.muted,
    spacing: 0.5,
  });
  writer.line(MARGIN.x, headingTop - 0.5, MARGIN.x, headingTop + 3.5, accent, 0.8);
  writer.y += 6.5;

  writer.text(model.party.name, textLeft, writer.y, { size: 12, bold: true });
  writer.y += 7;

  model.party.lines.forEach((line) => {
    const size = line.size || 7.6;
    writer.y += writer.paragraph(line.text, textLeft, writer.y, CONTENT_WIDTH * 0.68, {
      size,
      bold: line.strong,
      color: line.color || PDF_COLORS.body,
      lineHeight: lineHeightMm(size, 1.25),
    });
    writer.y += 1.4;
  });

  if (model.party.callout) {
    const callout = model.party.callout;
    const tint = callout.tint || PDF_COLORS.amberTint;
    const color = callout.color || PDF_COLORS.amber;
    // Width must match the draw call below (76mm box, 3.5mm padding each side).
    const bodyHeight = writer.measureParagraph(callout.body, 69, 8, true, lineHeightMm(8, 1.3));
    const boxHeight = bodyHeight + 8.5;

    writer.y += 2.5;
    writer.rect(textLeft, writer.y, 76, boxHeight, "FD", tint, color, 0.2);
    writer.text(callout.heading.toUpperCase(), textLeft + 3.5, writer.y + 4.3, {
      size: 6.4,
      bold: true,
      color,
      spacing: 0.4,
    });
    writer.paragraph(callout.body, textLeft + 3.5, writer.y + 8.8, 69, { size: 8, bold: true, lineHeight: lineHeightMm(8, 1.3) });
    writer.y += boxHeight;
  }

  writer.y += 7;
}

function columnPositions(columns: PdfColumn[]) {
  let cursor = MARGIN.x;
  return columns.map((column) => {
    const width = (column.width / 100) * CONTENT_WIDTH;
    const position = { x: cursor, width, column };
    cursor += width;
    return position;
  });
}

function drawTableHeader(writer: DocumentWriter, columns: PdfColumn[]) {
  const positions = columnPositions(columns);
  writer.line(MARGIN.x, writer.y, PAGE.width - MARGIN.x, writer.y, PDF_COLORS.black, 0.5);
  writer.y += 5.5;

  positions.forEach(({ x, width, column }) => {
    const anchor = column.align === "right" ? x + width - 2 : column.align === "center" ? x + width / 2 : x + 2;
    writer.text(column.header.toUpperCase(), anchor, writer.y, {
      size: 6.8,
      bold: true,
      align: column.align,
      spacing: 0.4,
    });
  });

  writer.y += 3;
  writer.line(MARGIN.x, writer.y, PAGE.width - MARGIN.x, writer.y, PDF_COLORS.black, 0.5);
  writer.y += 5;
  return positions;
}

// Vertical padding inside a row, split evenly above and below its text block.
const ROW_PAD_TOP = 2.6;
const ROW_PAD_BOTTOM = 3;
const ROW_GAP = ROW_PAD_TOP + ROW_PAD_BOTTOM;
const TITLE_PAD = 3.6;
const SUBTITLE_SIZE = 7.4;
const FOOTNOTE_SIZE = 6.6;

function measureRow(writer: DocumentWriter, row: PdfLineRow, descriptionWidth: number) {
  if (row.type === "title") {
    // Must match the wrap width drawTable() actually draws this at (below) —
    // a mismatch here means the reserved row height silently disagrees with
    // the text it's reserved for.
    return writer.measureParagraph(row.description, CONTENT_WIDTH - 5, 7.6, true, lineHeightMm(7.6, 1.25)) + TITLE_PAD * 2;
  }

  const lines = writer.itemLines(row.description, descriptionWidth);
  let height = richLinesHeight(lines);
  if (row.subtitle) {
    height += writer.measureParagraph(row.subtitle, descriptionWidth, SUBTITLE_SIZE, false, lineHeightMm(SUBTITLE_SIZE, 1.25)) + 0.8;
  }
  if (row.footnote) {
    height += writer.measureParagraph(row.footnote, descriptionWidth, FOOTNOTE_SIZE, true, lineHeightMm(FOOTNOTE_SIZE, 1.25)) + 1.2;
  }
  return height + ROW_GAP;
}

function drawTable(writer: DocumentWriter, model: PdfDocumentModel) {
  let positions = drawTableHeader(writer, model.columns);
  const descriptionWidth = positions[0].width - 4;

  model.rows.forEach((row) => {
    const height = measureRow(writer, row, descriptionWidth);

    if (writer.y + height > CONTENT_BOTTOM) {
      writer.newPage();
      positions = drawTableHeader(writer, model.columns);
    }

    const rowTop = writer.y;

    if (row.type === "title") {
      writer.rect(MARGIN.x, rowTop - TITLE_PAD + 0.6, CONTENT_WIDTH, height, "F", PDF_COLORS.shade);
      writer.paragraph(row.description, MARGIN.x + 2.5, rowTop + 2, CONTENT_WIDTH - 5, {
        size: 7.6,
        bold: true,
        lineHeight: lineHeightMm(7.6, 1.25),
        color: PDF_COLORS.black,
      });
      writer.y = rowTop + height;
      writer.line(MARGIN.x, writer.y - TITLE_PAD + 0.6, PAGE.width - MARGIN.x, writer.y - TITLE_PAD + 0.6, PDF_COLORS.rule, 0.2);
      return;
    }

    let textY = rowTop + ROW_PAD_TOP;
    const itemLines = writer.itemLines(row.description, descriptionWidth);
    textY += writer.richLines(itemLines, positions[0].x + 2, textY);

    // writer.paragraph() treats its y as the first line's baseline, while textY
    // tracks the top of the next line — offset by one ascent to convert.
    if (row.subtitle) {
      textY += 0.8;
      textY += writer.paragraph(row.subtitle, positions[0].x + 2, textY + SUBTITLE_SIZE * PT_TO_MM * 0.92, descriptionWidth, {
        size: SUBTITLE_SIZE,
        color: PDF_COLORS.muted,
        lineHeight: lineHeightMm(SUBTITLE_SIZE, 1.25),
      });
    }

    if (row.footnote) {
      textY += 1.2;
      writer.paragraph(row.footnote.toUpperCase(), positions[0].x + 2, textY + FOOTNOTE_SIZE * PT_TO_MM * 0.92, descriptionWidth, {
        size: FOOTNOTE_SIZE,
        bold: true,
        color: PDF_COLORS.muted,
        lineHeight: lineHeightMm(FOOTNOTE_SIZE, 1.25),
      });
    }

    // Numeric columns anchor to the first text baseline, not the row's full height.
    const firstLineBaseline = rowTop + ROW_PAD_TOP + (itemLines[0] ? itemLines[0].size * PT_TO_MM * 0.92 : 8.4 * PT_TO_MM * 0.92);
    (row.values || []).forEach((value, index) => {
      const position = positions[index + 1];
      if (!position) return;
      const { x, width, column } = position;
      const anchor = column.align === "right" ? x + width - 2 : column.align === "center" ? x + width / 2 : x + 2;
      const isLast = index === (row.values || []).length - 1;
      writer.text(value, anchor, firstLineBaseline, {
        size: 8.4,
        bold: isLast,
        color: isLast ? PDF_COLORS.black : PDF_COLORS.body,
        align: column.align,
      });
    });

    writer.y = rowTop + height;
    writer.line(MARGIN.x, writer.y - ROW_PAD_BOTTOM + 0.6, PAGE.width - MARGIN.x, writer.y - ROW_PAD_BOTTOM + 0.6, PDF_COLORS.rule, 0.2);
  });

  writer.y += 5;
}

function drawTotals(writer: DocumentWriter, model: PdfDocumentModel) {
  const blockWidth = 78;
  const left = PAGE.width - MARGIN.x - blockWidth;
  const right = PAGE.width - MARGIN.x;
  const totals = model.totals || [];
  const totalRowHeight = 6.2;
  const height = totals.length * totalRowHeight + (model.grandTotal ? 14 : 0);

  writer.ensureSpace(height + 4);

  totals.forEach((total) => {
    writer.text(total.label.toUpperCase(), left, writer.y + 3.6, {
      size: 7.6,
      bold: true,
      color: PDF_COLORS.body,
      spacing: 0.3,
    });
    writer.text(total.value, right, writer.y + 3.6, {
      size: 7.6,
      bold: true,
      color: total.color || PDF_COLORS.black,
      align: "right",
    });
    writer.y += totalRowHeight - 1;
    writer.line(left, writer.y, right, writer.y, PDF_COLORS.ruleFaint, 0.2);
    writer.y += 1;
  });

  if (model.grandTotal) {
    const color = model.grandTotal.color || PDF_COLORS.black;
    writer.y += 1;
    if (model.grandTotal.tint) {
      writer.rect(left, writer.y, blockWidth, 11, "F", model.grandTotal.tint);
    }
    writer.line(left, writer.y, right, writer.y, color, 0.6);
    writer.text(model.grandTotal.label.toUpperCase(), left + 2.5, writer.y + 7.2, {
      size: 9.5,
      bold: true,
      color,
      spacing: 0.5,
    });
    writer.text(model.grandTotal.value, right - 2.5, writer.y + 7.4, { size: 12.5, bold: true, color, align: "right" });
    writer.y += 11;
    writer.line(left, writer.y, right, writer.y, color, 0.6);
    writer.y += 4;
  }

  writer.y += 7;
}

function measurePanel(writer: DocumentWriter, panel: PdfPanel, width: number) {
  switch (panel.kind) {
    case "box": {
      let height = 10;
      if (panel.rows) height += panel.rows.length * lineHeightMm(7.4, 1.55);
      if (panel.text) height += richLinesHeight(writer.freeformLines(panel.text, width - 9, 7.6, PDF_COLORS.body));
      return height + 5.5;
    }
    case "notes": {
      const inner = panel.blocks.reduce(
        (sum, block) => sum + 4.3 + richLinesHeight(writer.freeformLines(block.body, width - 9, 7.4, PDF_COLORS.body)) + 3.5,
        0,
      );
      return inner + 6;
    }
    case "signature":
      return 34;
    case "acceptance": {
      return 21 + writer.measureParagraph(panel.intro, width - 10, 6.8, false, lineHeightMm(6.8, 1.3)) + panel.fields.length * 9;
    }
  }
}

function drawPanel(writer: DocumentWriter, panel: PdfPanel, x: number, y: number, width: number, assets: Assets) {
  switch (panel.kind) {
    case "box": {
      const height = measurePanel(writer, panel, width);
      writer.rect(x, y, width, height, "S", undefined, panel.borderColor || PDF_COLORS.rule, 0.2);
      writer.text(panel.heading.toUpperCase(), x + 4.5, y + 6.3, { size: 7.4, bold: true, spacing: 0.4 });

      let cursor = y + 12.5;
      const rowHeight = lineHeightMm(7.4, 1.55);
      (panel.rows || []).forEach((row) => {
        writer.text(row.label, x + 4.5, cursor, { size: 7.4, bold: true, color: PDF_COLORS.body });
        writer.text(`: ${row.value}`, x + 30, cursor, {
          size: 7.4,
          bold: true,
          color: row.color || PDF_COLORS.black,
        });
        cursor += rowHeight;
      });

      if (panel.text) {
        const lines = writer.freeformLines(panel.text, width - 9, 7.6, PDF_COLORS.body);
        writer.richLines(lines, x + 4.5, cursor);
      }
      return height;
    }

    case "notes": {
      const height = measurePanel(writer, panel, width);
      writer.rect(x, y, width, height, "S", undefined, PDF_COLORS.rule, 0.2);

      const innerX = x + 4.5;
      const innerWidth = width - 9;
      let cursor = y + 6;
      panel.blocks.forEach((block) => {
        writer.text(block.heading.toUpperCase(), innerX, cursor, { size: 7.2, bold: true, spacing: 0.4 });
        cursor += 4.3;
        const lines = writer.freeformLines(block.body, innerWidth, 7.4, PDF_COLORS.body);
        cursor += writer.richLines(lines, innerX, cursor);
        cursor += 3.5;
      });
      return height;
    }

    case "signature": {
      const centre = x + width / 2;
      if (panel.imageUrl && assets.signature) {
        try {
          const properties = writer.pdf.getImageProperties(assets.signature);
          const imageHeight = 22;
          const imageWidth = (properties.width / properties.height) * imageHeight;
          writer.pdf.addImage(assets.signature, "PNG", centre - imageWidth / 2, y + 1, imageWidth, imageHeight);
        } catch {
          // Signature is decorative — keep going without it.
        }
      }
      writer.line(x + 4, y + 24, x + width - 4, y + 24, PDF_COLORS.black, 0.3);
      writer.text(panel.caption.toUpperCase(), centre, y + 28, { size: 7, bold: true, align: "center", spacing: 0.4 });
      if (panel.subCaption) {
        writer.text(panel.subCaption, centre, y + 32, { size: 6.6, color: PDF_COLORS.body, align: "center" });
      }
      return 34;
    }

    case "acceptance": {
      const height = measurePanel(writer, panel, width);
      writer.rect(x, y, width, height, "FD", PDF_COLORS.shade, PDF_COLORS.black, 0.2);
      writer.text(panel.heading.toUpperCase(), x + 5, y + 7.3, { size: 8, bold: true, spacing: 0.4 });
      const introHeight = writer.paragraph(panel.intro, x + 5, y + 12.5, width - 10, {
        size: 6.8,
        color: PDF_COLORS.muted,
        lineHeight: lineHeightMm(6.8, 1.3),
      });

      let cursor = y + 15 + introHeight + 4;
      panel.fields.forEach((field) => {
        writer.text(field.toUpperCase(), x + 5, cursor, { size: 7.2, bold: true, color: PDF_COLORS.body, spacing: 0.3 });
        writer.line(x + 26, cursor + 0.8, x + width - 5, cursor + 0.8, PDF_COLORS.black, 0.2);
        cursor += 9;
      });
      return height;
    }
  }
}

function drawPanels(writer: DocumentWriter, model: PdfDocumentModel, assets: Assets) {
  const panels = (model.panels || []).filter(Boolean) as PdfPanel[];
  if (panels.length === 0) return;

  const gap = 9;
  const width = panels.length > 1 ? (CONTENT_WIDTH - gap) / 2 : CONTENT_WIDTH * 0.6;
  const height = Math.max(...panels.map((panel) => measurePanel(writer, panel, width)));

  writer.ensureSpace(height + 9);
  writer.line(MARGIN.x, writer.y, PAGE.width - MARGIN.x, writer.y, PDF_COLORS.rule, 0.2);
  writer.y += 7;

  const top = writer.y;
  panels.forEach((panel, index) => {
    drawPanel(writer, panel, MARGIN.x + index * (width + gap), top, width, assets);
  });

  writer.y = top + height + 7;
}

function drawClosingNote(writer: DocumentWriter, model: PdfDocumentModel) {
  if (!model.closingNote) return;

  writer.ensureSpace(19);
  writer.line(MARGIN.x, writer.y, PAGE.width - MARGIN.x, writer.y, PDF_COLORS.rule, 0.2);
  writer.y += 8;
  writer.text(model.closingNote.title, PAGE.width / 2, writer.y, { size: 9, bold: true, align: "center" });
  writer.y += 5;
  writer.text(model.closingNote.subtitle.toUpperCase(), PAGE.width / 2, writer.y, {
    size: 6.2,
    color: PDF_COLORS.muted,
    align: "center",
    spacing: 0.5,
  });
  writer.y += 6;
}

function drawFooters(writer: DocumentWriter) {
  const total = writer.pdf.getNumberOfPages();
  const footerText = companyFooterText();

  for (let page = 1; page <= total; page += 1) {
    writer.pdf.setPage(page);
    writer.line(MARGIN.x, PAGE.height - 20, PAGE.width - MARGIN.x, PAGE.height - 20, PDF_COLORS.ruleFaint, 0.3);

    const lines = writer.wrap(footerText, CONTENT_WIDTH - 24, 6.2);
    const footerLineHeight = lineHeightMm(6.2, 1.25);
    lines.forEach((line, index) => {
      writer.text(line, PAGE.width / 2, PAGE.height - 15.5 + index * footerLineHeight, {
        size: 6.2,
        color: PDF_COLORS.muted,
        align: "center",
      });
    });

    writer.text(`Page ${page} of ${total}`, PAGE.width - MARGIN.x, PAGE.height - 8, {
      size: 6.2,
      color: PDF_COLORS.muted,
      align: "right",
    });
  }
}

export async function renderDocumentPdf(model: PdfDocumentModel) {
  const { jsPDF: JsPdf, GState: GStateCtor } = await import("jspdf");
  const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  const needsSignature = (model.panels || []).some((panel) => panel?.kind === "signature" && panel.imageUrl);
  const [logo, signature] = await Promise.all([
    loadImageAsDataUrl("/logo.png", 320),
    needsSignature ? loadImageAsDataUrl("/signature.png", 520) : Promise.resolve(null),
  ]);
  const assets: Assets = { logo, signature };

  doc.setProperties({
    title: model.filename.replace(/\.pdf$/i, ""),
    subject: model.subject || model.title,
    author: COMPANY_PROFILE.legalName,
    creator: COMPANY_PROFILE.brandName,
    keywords: (model.keywords || []).join(", "),
  });

  const writer = new DocumentWriter(doc, GStateCtor);

  if (model.machineReadableText) {
    drawMachineReadableText(writer, model.machineReadableText);
  }

  if (model.watermark) {
    drawWatermark(writer, model.watermark, model.accent || PDF_COLORS.success);
  }

  drawHeader(writer, model, assets);
  drawParty(writer, model);
  drawTable(writer, model);
  drawTotals(writer, model);
  drawPanels(writer, model, assets);
  drawClosingNote(writer, model);
  drawFooters(writer);

  doc.save(model.filename);
}
