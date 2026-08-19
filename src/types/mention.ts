// src/types/mention.ts
import { z } from "zod";

// Zod Schema untuk memvalidasi JSON mentah yang masuk dari endpoint
export const RawMentionSchema = z.object({
  external_id: z.string().nullable().optional(),
  source: z.string(),
  title: z.string().nullable().optional(),
  content: z.string(),
  url: z.string().url(),
  author: z.string().nullable().optional(),
  published_at: z.any().nullable().optional(), // Karena format tanggal berantakan, kita terima apa saja dulu
  engagement: z.any().nullable().optional(), // Bisa angka murni atau string ("1,204")
});

// Tipe TS otomatis dari Zod (untuk data kotor)
export type RawMention = z.infer<typeof RawMentionSchema>;

// Tipe TS untuk data yang SUDAH dibersihkan dan siap masuk Database
export interface CleanMention {
  external_id: string | null;
  source: string;
  title: string | null;
  content: string;
  url: string;
  author: string | null;
  published_at: Date | null;
  engagement: number;
}
