// src/routes/search.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";

const router = Router();

// GET /mentions
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, source, from, to, page = "1", limit = "10" } = req.query;

    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);

    // Fallback to defaults to prevent NaN crashes from invalid inputs
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;

    // Cap limit to 100 to prevent database exhaustion
    if (limitNum > 100) limitNum = 100;

    const offset = (pageNum - 1) * limitNum;

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

    if (from) {
      const fromDate = new Date(from as string);
      if (isNaN(fromDate.getTime())) {
        res.status(400).json({ error: "Invalid 'from' date format" });
        return;
      }
      conditions.push(`published_at >= $${paramIndex}`);
      values.push(fromDate.toISOString());
      paramIndex++;
    }

    if (to) {
      const toDate = new Date(to as string);
      if (isNaN(toDate.getTime())) {
        res.status(400).json({ error: "Invalid 'to' date format" });
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
