// src/routes/search.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";

const router = Router();

// GET /mentions
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, source, from, to, page = "1", limit = "10" } = req.query;

    // PERBAIKAN 1: Defensive Programming untuk Paginasi
    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);

    // Mencegah error jika user memasukkan huruf (?page=abc) atau angka negatif
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;

    // Mencegah server overload jika user meminta jutaan data
    if (limitNum > 100) limitNum = 100;

    const offset = (pageNum - 1) * limitNum;

    // Membangun Query Parameterized
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`,
      );
      values.push(`%${q}%`);
      paramIndex++;
    }

    if (source) {
      conditions.push(`source ILIKE $${paramIndex}`);
      values.push(`%${source}%`);
      paramIndex++;
    }

    // PERBAIKAN 2: Validasi Tanggal Elegan (Mencegah DB Crash)
    if (from) {
      const fromDate = new Date(from as string);
      if (isNaN(fromDate.getTime())) {
        res
          .status(400)
          .json({ error: "Format parameter 'from' bukan tanggal yang valid" });
        return; // Hentikan eksekusi, jangan kirim ke DB
      }
      conditions.push(`published_at >= $${paramIndex}`);
      values.push(fromDate.toISOString());
      paramIndex++;
    }

    if (to) {
      const toDate = new Date(to as string);
      if (isNaN(toDate.getTime())) {
        res
          .status(400)
          .json({ error: "Format parameter 'to' bukan tanggal yang valid" });
        return;
      }
      conditions.push(`published_at <= $${paramIndex}`);
      values.push(toDate.toISOString());
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT * FROM mentions
      ${whereClause}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limitNum, offset);

    const countQuery = `SELECT COUNT(*) FROM mentions ${whereClause}`;
    const countValues = values.slice(0, paramIndex - 1);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, countValues),
    ]);

    const totalRecords = parseInt(countResult.rows[0].count, 10);

    res.json({
      meta: {
        page: pageNum,
        limit: limitNum,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limitNum),
      },
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error saat melakukan pencarian:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
