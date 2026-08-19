// src/routes/stats.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";

const router = Router();

// GET /mentions/stats
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const { group_by } = req.query;

    if (group_by !== "source" && group_by !== "day") {
      res.status(400).json({
        error: "Parameter 'group_by' must be 'source' or 'day'",
      });
      return;
    }

    let query = "";

    if (group_by === "source") {
      query = `
        SELECT source as category, COUNT(*)::INTEGER as count 
        FROM mentions 
        GROUP BY source 
        ORDER BY count DESC
      `;
    } else if (group_by === "day") {
      // Use TO_CHAR to format directly in PostgreSQL.
      // This prevents the node-postgres timezone shift bug when parsing dates.
      query = `
        SELECT TO_CHAR(published_at, 'YYYY-MM-DD') as category, COUNT(*)::INTEGER as count 
        FROM mentions 
        WHERE published_at IS NOT NULL
        GROUP BY TO_CHAR(published_at, 'YYYY-MM-DD')
        ORDER BY category ASC
      `;
    }

    const dbResult = await pool.query(query);

    res.json({
      group_by,
      data: dbResult.rows,
    });
  } catch (error) {
    console.error("Error saat mengambil data statistik:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
