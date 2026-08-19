// src/services/normalize.ts
import { RawMention, CleanMention } from "../types/mention";

export function normalizeMention(raw: RawMention): CleanMention {
  return {
    external_id: raw.external_id || null,
    source: normalizeSource(raw.source),
    title: raw.title || null,
    content: stripHtml(raw.content),
    url: raw.url,
    author: raw.author || null,
    published_at: parseDate(raw.published_at),
    engagement: parseEngagement(raw.engagement),
  };
}

function normalizeSource(source: string): string {
  const trimmed = source.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "").trim();
}

function parseEngagement(engagement: any): number {
  if (typeof engagement === "number") return engagement;
  if (typeof engagement === "string") {
    const parsed = parseInt(engagement.replace(/,/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;

  if (typeof dateValue === "number") {
    return new Date(dateValue * 1000);
  }

  if (typeof dateValue === "string") {
    const ddMmYyyyMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddMmYyyyMatch) {
      const day = parseInt(ddMmYyyyMatch[1], 10);
      const month = parseInt(ddMmYyyyMatch[2], 10) - 1;
      const year = parseInt(ddMmYyyyMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}
