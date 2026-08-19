// src/routes/ingest.ts
import { Router, Request, Response } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { RawMentionSchema } from "../types/mention";
import { normalizeMention } from "../services/normalize";

const router = Router();

// POST /internal/mentions/bulk
router.post("/bulk", async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = z.array(RawMentionSchema).safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Format data tidak valid",
        details: validationResult.error,
      });
      return;
    }

    const rawData = validationResult.data;
    if (rawData.length === 0) {
      res.status(200).json({ message: "Tidak ada data untuk diproses" });
      return;
    }

    const cleanData = rawData.map((item) => normalizeMention(item));

    let paramIndex = 1;
    const values: any[] = [];
    const placeholders: string[] = [];

    for (const item of cleanData) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );

      values.push(
        item.external_id,
        item.source,
        item.title,
        item.content,
        item.url,
        item.author,
        item.published_at,
        item.engagement,
      );
    }

    // Enforce idempotency via ON CONFLICT (url) DO NOTHING
    const query = `
      INSERT INTO mentions (external_id, source, title, content, url, author, published_at, engagement)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (url) DO NOTHING;
    `;

    const dbResult = await pool.query(query, values);

    res.status(201).json({
      message: "Bulk ingest berhasil diproses",
      data_diterima: cleanData.length,
      data_tersimpan_baru: dbResult.rowCount,
    });
  } catch (error) {
    console.error("Error saat bulk ingest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
