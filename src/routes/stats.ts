// src/routes/stats.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";

const router = Router();

// GET /mentions/stats
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const { group_by } = req.query;

    // Defensive Programming: Tolak request jika parameternya ngawur
    if (group_by !== "source" && group_by !== "day") {
      res.status(400).json({
        error: "Parameter 'group_by' wajib diisi dengan 'source' atau 'day'",
      });
      return;
    }

    let query = "";

    if (group_by === "source") {
      // Skenario 1: Grup berdasarkan Sumber (Source)
      // Diurutkan dari media yang paling banyak membuat artikel ke yang paling sedikit
      query = `
        SELECT source as category, COUNT(*)::INTEGER as count 
        FROM mentions 
        GROUP BY source 
        ORDER BY count DESC
      `;
    } else if (group_by === "day") {
      // Skenario 2: Grup berdasarkan Hari (Day)
      // PERBAIKAN: Menggunakan TO_CHAR agar PostgreSQL mengirim string murni 'YYYY-MM-DD'
      // Ini mencegah bug Timezone Shift (hari mundur 1 hari) saat di-parsing oleh Node.js
      query = `
        SELECT TO_CHAR(published_at, 'YYYY-MM-DD') as category, COUNT(*)::INTEGER as count 
        FROM mentions 
        WHERE published_at IS NOT NULL
        GROUP BY TO_CHAR(published_at, 'YYYY-MM-DD')
        ORDER BY category ASC
      `;
    }

    // Eksekusi query
    const dbResult = await pool.query(query);

    // Kembalikan format JSON yang mudah dibaca oleh pembuat Grafik Frontend (Chart.js / Recharts)
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
