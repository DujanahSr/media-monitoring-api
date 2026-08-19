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
    // 1. Validasi input: Memastikan payload yang dikirim adalah array JSON
    const validationResult = z.array(RawMentionSchema).safeParse(req.body);

    if (!validationResult.success) {
      res
        .status(400)
        .json({
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

    // 2. Normalisasi setiap baris data (membersihkan HTML, memperbaiki tanggal, dll)
    const cleanData = rawData.map((item) => normalizeMention(item));

    // 3. Bangun query SQL secara dinamis (Parameterized Query) untuk BULK INSERT
    // Kenapa begini? Untuk menghindari SQL Injection dan mengeksekusinya dalam 1 kali query ke database.
    let paramIndex = 1;
    const values: any[] = [];
    const placeholders: string[] = [];

    for (const item of cleanData) {
      // Kita membuat placeholder ($1, $2, $3...) untuk tiap kolom
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );

      // Memasukkan nilai aktualnya ke array terpisah
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

    // 4. Eksekusi ke database dengan aturan IDEMPOTENCY
    // Kunci Idempotency: ON CONFLICT (url) DO NOTHING
    // Jika URL sudah ada di database, baris tersebut akan dilewati (skip) tanpa error
    const query = `
      INSERT INTO mentions (external_id, source, title, content, url, author, published_at, engagement)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (url) DO NOTHING;
    `;

    // Jalankan query ke DB
    const dbResult = await pool.query(query, values);

    // Kirim respons
    res.status(201).json({
      message: "Bulk ingest berhasil diproses",
      data_diterima: cleanData.length,
      data_tersimpan_baru: dbResult.rowCount, // RowCount hanya menghitung data yang sukses tersimpan (bukan duplikat)
    });
  } catch (error) {
    console.error("Error saat bulk ingest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
