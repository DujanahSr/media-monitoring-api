// src/services/normalize.ts
import { RawMention, CleanMention } from "../types/mention";

// Fungsi utama yang dipanggil oleh endpoint nanti
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

// 1. Membersihkan & merapikan nama sumber ("thestar" -> "Thestar")
function normalizeSource(source: string): string {
  const trimmed = source.trim();
  // Ubah huruf pertama jadi kapital, sisanya huruf kecil
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// 2. Menghapus tag HTML (termasuk tag jahat seperti <script>alert(1)</script>)
function stripHtml(html: string): string {
  // Regex ini menghapus semua yang berada di dalam kurung siku <...>
  return html.replace(/<[^>]*>?/gm, "").trim();
}

// 3. Mengubah engagement yang aneh ("1,204") jadi angka murni (1204)
function parseEngagement(engagement: any): number {
  if (typeof engagement === "number") return engagement;
  if (typeof engagement === "string") {
    const parsed = parseInt(engagement.replace(/,/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// 4. Menangani 3 format tanggal berbeda dari JSON sampel
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;

  // Kasus A: Jika berupa unix timestamp (seperti 1786435200)
  if (typeof dateValue === "number") {
    return new Date(dateValue * 1000); // Kali 1000 karena JS pakai milidetik
  }

  if (typeof dateValue === "string") {
    // Kasus B: Format lokal DD/MM/YYYY (contoh: "11/08/2026")
    const ddMmYyyyMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddMmYyyyMatch) {
      const day = parseInt(ddMmYyyyMatch[1], 10);
      const month = parseInt(ddMmYyyyMatch[2], 10) - 1; // Bulan di JS dimulai dari index 0
      const year = parseInt(ddMmYyyyMatch[3], 10);
      return new Date(year, month, day);
    }

    // Kasus C: Format string standar seperti "2026-08-10 08:20:00" atau "2026-08-10T08:15:00Z"
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}
